/*jshint esversion: 8 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pinoLogger = require('./logger');
const connectToDatabase = require('./models/db');
const { loadData } = require("./util/import-mongo/index");

const app = express();
const port = 3060;

// Middleware
app.use("*", cors());
app.use(express.json());

// Conexión a MongoDB una sola vez al iniciar el servidor
connectToDatabase()
  .then(() => {
    pinoLogger.info('Connected to DB');
  })
  .catch((e) => {
    pinoLogger.error('Failed to connect to DB', e);
    console.error('Failed to connect to DB', e);
  });

// ✅ Tarea 1: Importación de rutas
const secondChanceItemsRoutes = require('./routes/secondChanceItemsRoutes');
const searchRoutes = require('./routes/searchRoutes');
// Importar rutas de autenticación
const authRoutes = require('./routes/authRoutes');

// Logger HTTP
const pinoHttp = require('pino-http');
const logger = require('./logger');
app.use(pinoHttp({ logger }));

// ✅ Tarea 2: Uso de rutas - CORREGIDO
app.use('/api/secondchance/items', secondChanceItemsRoutes);
app.use('/api/secondchance/search', searchRoutes);
// Añadir rutas de autenticación
app.use('/api/auth', authRoutes);

// Ruta base
app.get("/", (req, res) => {
  res.send("Inside the server");
});

// Manejador de errores global
app.use((err, req, res, next) => {
  logger.error(err);
  console.error(err);
  res.status(500).send('Internal Server Error');
});

// Inicio del servidor
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  console.log(`Server running on port ${port}`);
});

module.exports = app; // Exportar para testing