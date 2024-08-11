const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 5173;

app.use(cors());
// Sirve los archivos estáticos desde la carpeta dist
app.use(express.static(path.join(__dirname, 'dist_web')));

// Ruta principal, redirige a index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist_web', 'index.html'));
});

// Inicia el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
