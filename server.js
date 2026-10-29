const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { pool, inicializar } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const IMG_DIR = path.join(__dirname, 'public', 'img');
const RUTA_PUBLICA = '/img/';
fs.mkdirSync(IMG_DIR, { recursive: true });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));

app.locals.fechaES = (f) => {
  const d = new Date(f + 'T00:00:00');
  return isNaN(d) ? f : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Permite usar funciones async en las rutas y pasar los errores a Express
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- Subida de ficheros ----------
const upload = multer({
  storage: multer.diskStorage({
    destination: IMG_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)),
});

// ---------- Utilidades ----------
function leerFiltros(q) {
  const categoria = parseInt(q.categoria, 10) || 0;
  let et = q.etiqueta || [];
  if (!Array.isArray(et)) et = [et];
  et = et.map((s) => String(s).trim().toLowerCase()).filter(Boolean);
  return { categoria, etiquetas: [...new Set(et)] };
}

function queryString(f) {
  const p = new URLSearchParams();
  if (f.categoria) p.set('categoria', f.categoria);
  f.etiquetas.forEach((e) => p.append('etiqueta', e));
  const s = p.toString();
  return s ? '?' + s : '';
}

// Imágenes de la categoría indicada que tienen TODAS las etiquetas seleccionadas
async function buscarImagenes(f) {
  let sql = 'SELECT i.* FROM IMAGENES i WHERE 1=1';
  const params = [];
  if (f.categoria) { sql += ' AND i.idCategoria = ?'; params.push(f.categoria); }
  if (f.etiquetas.length) {
    sql += ` AND (SELECT COUNT(DISTINCT e.Etiqueta) FROM ETIQUETAS e
              WHERE e.idImagen = i.id
                AND e.Etiqueta IN (${f.etiquetas.map(() => '?').join(',')})) = ?`;
    params.push(...f.etiquetas, f.etiquetas.length);
  }
  sql += ' ORDER BY i.fecha DESC, i.id DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function categoriasTodas() {
  const [rows] = await pool.query('SELECT * FROM CATEGORIAS ORDER BY categoria');
  return rows;
}

// ---------- Inicio ----------
app.get('/', wrap(async (req, res) => {
  const [[imagen]] = await pool.query('SELECT * FROM IMAGENES ORDER BY RAND() LIMIT 1');
  res.render('inicio', { titulo: 'Inicio', activo: 'inicio', imagen });
}));

// ---------- Categorías ----------
app.get('/categorias', wrap(async (req, res) => {
  const [categorias] = await pool.query(`
    SELECT c.id, c.categoria, COUNT(i.id) AS total
    FROM CATEGORIAS c LEFT JOIN IMAGENES i ON i.idCategoria = c.id
    GROUP BY c.id, c.categoria ORDER BY c.categoria`);
  res.render('categorias', {
    titulo: 'Categorías', activo: 'categorias', categorias,
    mensaje: req.query.msg || '', error: req.query.err || '',
  });
}));

app.post('/categorias', wrap(async (req, res) => {
  const nombre = String(req.body.categoria || '').trim();
  if (!nombre) return res.redirect('/categorias?err=' + encodeURIComponent('Escribe un nombre de categoría.'));
  try {
    await pool.query('INSERT INTO CATEGORIAS (categoria) VALUES (?)', [nombre]);
    res.redirect('/categorias?msg=' + encodeURIComponent(`Categoría «${nombre}» añadida.`));
  } catch (e) {
    if (e.code !== 'ER_DUP_ENTRY') throw e;
    res.redirect('/categorias?err=' + encodeURIComponent('Esa categoría ya existe.'));
  }
}));

app.post('/categorias/:id/eliminar', wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM IMAGENES WHERE idCategoria = ?', [id]);
  if (n > 0) {
    return res.redirect('/categorias?err=' + encodeURIComponent(`No se puede eliminar: tiene ${n} imagen(es) asociada(s).`));
  }
  await pool.query('DELETE FROM CATEGORIAS WHERE id = ?', [id]);
  res.redirect('/categorias?msg=' + encodeURIComponent('Categoría eliminada.'));
}));

// ---------- Subida ----------
app.get('/subir', wrap(async (req, res) => {
  res.render('subir', {
    titulo: 'Subir imagen', activo: 'subir', categorias: await categoriasTodas(),
    error: '', ok: req.query.ok === '1', hoy: new Date().toISOString().slice(0, 10),
  });
}));

app.post('/subir', upload.single('imagen'), wrap(async (req, res) => {
  const categorias = await categoriasTodas();
  const render = (error) => res.status(400).render('subir', {
    titulo: 'Subir imagen', activo: 'subir', categorias,
    error, ok: false, hoy: req.body.fecha || new Date().toISOString().slice(0, 10),
  });
  const borrarFichero = () => req.file && fs.unlink(req.file.path, () => {});

  const titulo = String(req.body.titulo || '').trim();
  const fecha = String(req.body.fecha || '').trim();
  const idCategoria = parseInt(req.body.categoria, 10);
  const etiquetas = [...new Set(String(req.body.etiquetas || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))];

  if (!req.file) return render('Selecciona un fichero de imagen válido (JPG, PNG, WEBP, GIF o AVIF).');
  if (!titulo) { borrarFichero(); return render('El nombre es obligatorio.'); }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { borrarFichero(); return render('La fecha no es válida.'); }
  if (!categorias.some((c) => c.id === idCategoria)) {
    borrarFichero(); return render('Selecciona una categoría existente.');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      'INSERT INTO IMAGENES (titulo, idCategoria, fecha, ruta, fichero) VALUES (?, ?, ?, ?, ?)',
      [titulo, idCategoria, fecha, RUTA_PUBLICA, req.file.filename]
    );
    for (const e of etiquetas) {
      await conn.query('INSERT INTO ETIQUETAS (idImagen, Etiqueta) VALUES (?, ?)', [r.insertId, e]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    borrarFichero();
    return render('No se pudo guardar la imagen.');
  } finally {
    conn.release();
  }
  res.redirect('/subir?ok=1');
}));

// ---------- Galería ----------
app.get('/galeria', wrap(async (req, res) => {
  const filtro = leerFiltros(req.query);
  const imagenes = await buscarImagenes(filtro);
  const [filas] = await pool.query(`
    SELECT DISTINCT e.Etiqueta AS e FROM ETIQUETAS e
    JOIN IMAGENES i ON i.id = e.idImagen
    ${filtro.categoria ? 'WHERE i.idCategoria = ?' : ''}
    ORDER BY e.Etiqueta`, filtro.categoria ? [filtro.categoria] : []);
  res.render('galeria', {
    titulo: 'Galería', activo: 'galeria', filtro, imagenes,
    etiquetas: filas.map((r) => r.e),
    categorias: await categoriasTodas(), qs: queryString(filtro),
  });
}));

// ---------- Visor ----------
app.get('/imagen/:id', wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const filtro = leerFiltros(req.query);
  const lista = await buscarImagenes(filtro);
  const idx = lista.findIndex((i) => i.id === id);
  if (idx === -1) {
    // La imagen no está en el mosaico filtrado: se muestra sin navegación
    const [[sola]] = await pool.query('SELECT * FROM IMAGENES WHERE id = ?', [id]);
    if (!sola) return res.status(404).render('404', { titulo: 'No encontrada', activo: '' });
    return res.render('visor', { titulo: sola.titulo, imagen: sola, prev: null, next: null, pos: 1, total: 1, qs: '' });
  }
  res.render('visor', {
    titulo: lista[idx].titulo, imagen: lista[idx],
    prev: idx > 0 ? lista[idx - 1].id : null,
    next: idx < lista.length - 1 ? lista[idx + 1].id : null,
    pos: idx + 1, total: lista.length, qs: queryString(filtro),
  });
}));

// ---------- Contacto ----------
app.get('/contacto', (req, res) => res.render('contacto', { titulo: 'Contacto', activo: 'contacto' }));

app.use((req, res) => res.status(404).render('404', { titulo: 'No encontrada', activo: '' }));

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Error interno del servidor');
});

inicializar()
  .then(() => app.listen(PORT, () => console.log(`Galería disponible en http://localhost:${PORT}`)))
  .catch((e) => {
    console.error('No se pudo conectar a MySQL:', e.message);
    process.exit(1);
  });
