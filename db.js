// Conexión a MySQL y creación de la base de datos DATOS con sus tablas
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'galeria',
  password: process.env.DB_PASSWORD || 'EVisible27_',
  database: process.env.DB_NAME || 'DATOSCL',
  charset: 'utf8mb4',
  dateStrings: true,        // las fechas DATE llegan como 'AAAA-MM-DD'
  waitForConnections: true,
  connectionLimit: 10,
};

const pool = mysql.createPool(config);

async function inicializar() {
  // 1) Crea la base de datos si no existe
  const { database, ...sinBase } = config;
  const admin = await mysql.createConnection(sinBase);
  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await admin.end();

  // 2) Crea las tablas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS CATEGORIAS (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      categoria VARCHAR(60) NOT NULL UNIQUE
    ) ENGINE=InnoDB`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS IMAGENES (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      titulo VARCHAR(120) NOT NULL,
      idCategoria INT UNSIGNED NOT NULL,
      fecha DATE NOT NULL,
      ruta VARCHAR(255) NOT NULL DEFAULT '/img/',
      fichero VARCHAR(255) NOT NULL,
      INDEX idx_imagenes_categoria (idCategoria),
      CONSTRAINT fk_imagenes_categoria FOREIGN KEY (idCategoria) REFERENCES CATEGORIAS(id)
    ) ENGINE=InnoDB`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ETIQUETAS (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      idImagen INT UNSIGNED NOT NULL,
      Etiqueta VARCHAR(60) NOT NULL,
      INDEX idx_etiquetas_imagen (idImagen),
      INDEX idx_etiquetas_texto (Etiqueta),
      CONSTRAINT fk_etiquetas_imagen FOREIGN KEY (idImagen) REFERENCES IMAGENES(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);
}

module.exports = { pool, inicializar };
