const express = require('express');
const path = require('path');
const app = express();

// Servir archivos estáticos desde el directorio raíz
app.use(express.static(path.join(__dirname)));

// Ruta para la página principal
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta para /app
app.get('/app', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Ruta para /app/home.html
app.get('/app/home.html', function (req, res) {
  res.sendFile(path.join(__dirname, 'home.html'));
});

// Ruta para /home
app.get('/home', function (req, res) {
  res.sendFile(path.join(__dirname, 'home.html'));
});

// Ruta para /home.html
app.get('/home.html', function (req, res) {
  res.sendFile(path.join(__dirname, 'home.html'));
});

app.listen(9000, () => {
  console.log('Servidor ejecutándose en el puerto 9000');
});