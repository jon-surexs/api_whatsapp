// src/index.js
require("dotenv").config();

const express = require("express");
const apiRoute = require("./routes/routes");     // Carga las rutas
const connectDB = require('./config/db');         // Carga la función para conectar a MongoDB
const logger = require('./utils/logger');         // ¡Importa el logger centralizado!

// --- Logs iniciales de la aplicación usando el logger ---
logger.info("index.js loaded.");
logger.debug("Starting Express application setup.");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para parsear el cuerpo de las peticiones JSON
app.use(express.json());
// Soporte para fomrs
app.use(express.urlencoded({ extended: true }));

// Middleware para loguear todas las peticiones entrantes ANTES de que lleguen a las rutas específicas
app.use((req, res, next) => {
    logger.info(`Incoming Request: ${req.method} ${req.url}`);
    logger.debug(`Request Body: ${JSON.stringify(req.body)}`); // Log del cuerpo de la petición
    next(); // Pasa la petición a la siguiente función middleware o ruta
});

// Define las rutas principales de la API para WhatsApp
// Todas las peticiones serán manejadas por apiRoute (que incluye /whatsapp)
app.use("/", apiRoute);

// Conecta a la base de datos MongoDB
connectDB(); 

// Inicia el servidor Express
app.listen(PORT, () => {
    logger.info(`Express server listening on port: ${PORT}`);
});

logger.debug("Express application configured. Awaiting connections.");