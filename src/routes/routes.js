// src/routes/routes.js

const express = require("express");
const router = express.Router();
const whatsAppController = require("../controllers/whatsappControllers"); // Asegúrate de que la ruta sea correcta
const logger = require('../utils/logger'); // ¡Importa el logger centralizado!

// Log de carga del módulo usando el logger
logger.info("routes.js loaded and initialized."); 

router
    // Ruta GET para la verificación del webhook de Meta
    .get("/whatsapp", (req, res) => {
        logger.info("GET /whatsapp route hit for webhook verification."); // Usa logger.info
        whatsAppController.VerifyToken(req, res);
    })
    // Ruta POST para recibir mensajes y eventos del webhook de Meta
    .post("/whatsapp", (req, res) => {
        logger.info("POST /whatsapp route hit for incoming message/event."); // Usa logger.info
        whatsAppController.ReceivedMessage(req, res);
    });

module.exports = router;