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
  .catch((e) => console.error('Failed to connect to DB', e));

// ✅ Importación de rutas
//const authRoutes = require('./routes/auth');
const secondChanceItemsRoutes = require('./routes/secondChanceItemsRoutes');
const searchRoutes = require('./routes/searchRoutes');

// Logger HTTP
const pinoHttp = require('pino-http');
const logger = require('./logger');
app.use(pinoHttp({ logger }));

// ✅ Uso de rutas
//app.use('/auth', authRoutes);
app.use('/items', secondChanceItemsRoutes);
app.use('/gifts', searchRoutes);


// Ruta base
app.get("/", (req, res) => {
  res.send("Inside the server");
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Server Error');
});

// Inicio del servidor
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
