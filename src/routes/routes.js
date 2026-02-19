// src/routes/routes.js

const express = require("express");
const router = express.Router();

const whatsAppController = require("../controllers/whatsappControllers");
const logger = require("../utils/logger");
const outboxRoutes = require("./outboxRoutes");

// Log de carga del módulo
logger.info("routes.js loaded and initialized.");

// --- WEBHOOK WHATSAPP ---

// Verificación del webhook
router.get("/whatsapp", (req, res) => {
  logger.info("GET /whatsapp route hit for webhook verification.");
  whatsAppController.VerifyToken(req, res);
});

// Recepción de mensajes
router.post("/whatsapp", (req, res) => {
  logger.info("POST /whatsapp route hit for incoming message/event.");
  whatsAppController.ReceivedMessage(req, res);
});

// --- PANEL OUTBOX ---
router.use(outboxRoutes);

module.exports = router;
