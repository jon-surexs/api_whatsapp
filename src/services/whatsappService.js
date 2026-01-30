// src/services/whatsappService.js


const axios = require("axios");
const logger = require("../utils/logger");

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "121909740999261";

if (!WHATSAPP_TOKEN) {
  throw new Error("WHATSAPP_TOKEN no está definido. Revisa tu .env y que dotenv cargue antes.");
}

logger.info("whatsappService.js inicializado.");
logger.debug("WHATSAPP_TOKEN usado (Servicio):", WHATSAPP_TOKEN ? (WHATSAPP_TOKEN.substring(0, 10) + "...") : "NO TOKEN SET");
logger.debug("PHONE_NUMBER_ID usado (Servicio):", PHONE_NUMBER_ID);

const SendWhatsAppMessage = async (to, messageContent) => {
  const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
  let toClean = String(to).replace(/\D/g, "");
    // Si llega en formato México móvil con 521, lo convertimos a 52
    if (toClean.startsWith("521") && toClean.length === 13) {
      toClean = "52" + toClean.substring(3);
    }// quita + y cualquier separador

  logger.info("⚙️ Servicio: INICIANDO Envío de Mensaje");
  logger.debug("⚙️ Servicio: Destinatario (TO):", toClean);
  logger.debug("⚙️ Servicio: Contenido a enviar:", messageContent);

  try {
    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to: toClean,
        ...messageContent,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        },
      }
    );

    logger.info("✅ Servicio: Mensaje enviado con éxito.", response.data);
    return response.data;
  } catch (error) {
    logger.error("❌ Servicio: Error al enviar mensaje:", error.response ? error.response.data : error.message);
    if (error.response) {
      logger.error(" - Status HTTP:", error.response.status);
      logger.error(" - Data del error (API):", JSON.stringify(error.response.data, null, 2));
    }
  console.error("❌ WhatsApp API error status:", error?.response?.status);
  console.error("❌ WhatsApp API error data:", JSON.stringify(error?.response?.data, null, 2));
  console.error("❌ WhatsApp API error message:", error.message);
    throw error;
  }
};

module.exports = { SendWhatsAppMessage };
