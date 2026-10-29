# Galería de fotografías (NodeJS + MySQL)

Express + MySQL (mysql2) + EJS. Al arrancar se crea la base de datos **DATOS** y sus tablas
CATEGORIAS, IMAGENES y ETIQUETAS si no existen. Las imágenes se guardan en `public/img/`.

## Requisitos
- Node.js 18 o superior
- MySQL 8 (o MariaDB 10.5+) con un usuario que tenga permisos sobre la base de datos DATOS

## Puesta en marcha
    npm install
    export DB_USER=galeria DB_PASSWORD=tu_clave DB_HOST=localhost
    npm start

Abre http://localhost:3000. Primer uso: crea una categoría en **Categorías** y luego sube imágenes.

Para crear un usuario de ejemplo en MySQL:
    CREATE USER 'galeria'@'localhost' IDENTIFIED BY 'tu_clave';
    GRANT ALL PRIVILEGES ON DATOS.* TO 'galeria'@'localhost';
    -- si la base aún no existe, el usuario necesita también permiso para crearla:
    GRANT CREATE ON *.* TO 'galeria'@'localhost';

## Estructura
    server.js            rutas y lógica
    db.js                conexión y esquema MySQL de DATOS
    views/               páginas EJS
    public/              CSS, JS e imágenes
