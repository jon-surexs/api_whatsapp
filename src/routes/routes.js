// src/routes/routes.js

const express = require("express");
const router = express.Router();

const whatsAppController = require("../controllers/whatsappControllers");
const logger = require("../utils/logger");

// Controllers panel leads
const { listBenefitsLeads } = require("../controllers/benefitsLeadsController");
const { listBenefitsLeadsSmall } = require("../controllers/benefitsLeadsSmallController");
const { listFleetLeads } = require("../controllers/fleetLeadsController");
const { listFleetSmallLeads } = require("../controllers/fleetLeadsSmallController");
const { listOtherInsuranceLeads } = require("../controllers/otherInsuranceLeadsController");
const { listContactAdvisor } = require("../controllers/contactAdvisorController");


// Log de carga del módulo
logger.info("routes.js loaded and initialized.");


// ------------------------------------------------------------
// WEBHOOK WHATSAPP
// ------------------------------------------------------------

router.get("/whatsapp", (req, res) => {
  logger.info("GET /whatsapp route hit for webhook verification.");
  whatsAppController.VerifyToken(req, res);
});

router.post("/whatsapp", (req, res) => {
  logger.info("POST /whatsapp route hit for incoming message/event.");
  whatsAppController.ReceivedMessage(req, res);
});


// ------------------------------------------------------------
// PANEL LEADS
// ------------------------------------------------------------

// Empresas grandes (>50 empleados)
router.get("/benefits-leads", listBenefitsLeads);

// Empresas pequeñas (<20 empleados)
router.get("/benefits-small-leads", listBenefitsLeadsSmall);

// Empresas pequeñas (<20 empleados)
router.get("/fleet-leads", listFleetLeads);
// Empresas pequeñas (<20 empleados)
router.get("/fleet-small-leads", listFleetSmallLeads);
// Empresas pequeñas (<20 empleados)
router.get("/other-insurance", listOtherInsuranceLeads);
// Empresas pequeñas (<20 empleados)
router.get("/contact-advisor", listContactAdvisor);
module.exports = router;