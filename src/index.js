// src/index.js
require("dotenv").config();

const express = require("express");
const apiRoute = require("./routes/routes");
const connectDB = require('./config/db');
const logger = require('./utils/logger');

// --- Logs iniciales ---
logger.info("index.js loaded.");
logger.debug("Starting Express application setup.");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware base ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Logger middleware ---
app.use((req, res, next) => {
    logger.info(`Incoming Request: ${req.method} ${req.url}`);
    logger.debug(`Request Body: ${JSON.stringify(req.body)}`);
    next();
});

// --- Healthcheck (IMPORTANTE para AWS / Meta / monitoreo) ---
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

// --- Rutas principales ---
app.use("/", apiRoute);

// --- ARRANQUE DEL SERVIDOR PRIMERO ---
app.listen(PORT, async () => {
    logger.info(`Server listening on ${PORT}`);

    // --- CONEXIÓN A DB DESPUÉS (NO BLOQUEA WEBHOOK) ---
    try {
        await connectDB();
        logger.info("MongoDB connected successfully.");
    } catch (error) {
        logger.error("MongoDB connection failed:", error);
    }
});

logger.debug("Express application configured. Awaiting connections.");