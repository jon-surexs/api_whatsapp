// src/routes/outboxRoutes.js
const express = require("express");
const router = express.Router();

const {
  listOutboxLeads,
  getOutboxLeadDetail,
  setOutboxLeadStatus,
} = require("../controllers/outboxController");

// Lista (HTML por defecto, JSON si ?format=json)
router.get("/outbox/leads", listOutboxLeads);

// Detalle
router.get("/outbox/leads/:id", getOutboxLeadDetail);

// Cambiar status (desde form)
router.post("/outbox/leads/:id/status", setOutboxLeadStatus);

module.exports = router;
