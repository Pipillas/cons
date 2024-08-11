const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 5174;

app.use(cors());
app.use(express.json());
// Sirve los archivos estáticos desde la carpeta dist
app.use(express.static(path.join(__dirname, 'dist_interno')));

// Ruta principal, redirige a index.html
//  app.get('*', (req, res) => {
//  res.sendFile(path.join(__dirname, 'dist_interno', 'index.html'));
//});

app.get('/interno/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist_interno', 'interno', 'index.html'));
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
