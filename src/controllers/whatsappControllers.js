// src/controllers/whatsappControllers.js
// Qué hace:
// Recibe mensaje del webhook.
// Llama a messageHandler.
// Es el punto de entrada.

// const fs = require("fs");

// const myConsole = new console.Console(
//   fs.createWriteStream("./logs.txt", { flags: "a" })

// );
// --- Módulos Importados ---
// --- Importar el nuevo handler de mensajes ---
const messageHandler = require('../handlers/messageHandler');
// --- Importar el nuevo servicio de WhatsApp (si ya lo tienes) ---
const whatsappService = require('../services/whatsappService');
// --- Importar el modelo de usuario (si ya lo tienes) ---
const UserConversation = require('../models/UserConversation');
// --- Importar el nuevo logger ---
const logger = require('../utils/logger');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN ;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || "121909740999261";

// Log inicial para confirmar que el controlador ha sido cargado
console.log("--- DEBUG: whatsappController.js file HAS BEEN READ AND INITIALIZED ---");
// Log inicial para confirmar que el controlador ha sido cargado
logger.info("whatsappController.js loaded and initialized."); // Usa logger.info
logger.debug("--- DEBUG: WHATSAPP_TOKEN usado:", WHATSAPP_TOKEN ? (WHATSAPP_TOKEN.substring(0, 10) + "...") : "NO TOKEN SET");
logger.debug("--- DEBUG: PHONE_NUMBER_ID usado:", PHONE_NUMBER_ID);


// --- Función para verificar el Webhook de Meta ---
const VerifyToken = (req, res) => {

  console.log("--- DEBUG: VerifyToken function ENTERED. ---");

  try {

    const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "jon666";

    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const mode = req.query["hub.mode"];

    console.log("RAW URL:", req.originalUrl);
    console.log("QUERY:", req.query);

    logger.debug("mode:", mode);
    logger.debug("token:", token);
    logger.debug("challenge:", challenge);

    // ✅ CASO CORRECTO
    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {

      console.log("✔ VERIFY OK");

      return res
        .status(200)
        .type("text/plain")
        .send(String(challenge));
    }

    // ❌ CASO FALLIDO
    console.log("✖ VERIFY FAILED");

    return res.sendStatus(403);

  } catch (e) {
    console.error("Error en VerifyToken:", e);
    return res.sendStatus(500);
  }
};
// --- Fin Función de Verificación ---

// --- Función para Recibir y Procesar Webhooks de Mensajes ---
// Esta es la función principal que procesa los mensajes entrantes de WhatsApp.
const ReceivedMessage = async (req, res) => {
     // Estos logs básicos de depuración siempre se ejecutarán al inicio
    logger.debug("!!! RECEIVED MESSAGE EXECUTED - RAW DEBUG LOG IN TERMINAL !!!"); // ESTE DEBERÍA APARECER EN TERMINAL
    logger.debug("!!! RECEIVED MESSAGE EXECUTED - RAW DEBUG LOG IN FILE !!!");    // ESTE DEBERÍA APARECER EN logs.txt
    logger.debug("Full request body received", req.body); // ESTE DEBERÍA APARECER EN logs.txt
  console.log("✅ POST /whatsapp recibido");
  console.log("Body:", JSON.stringify(req.body));


  try {
        
    // Extrae los datos relevantes del webhook de WhatsApp
    const entry = req.body.entry[0];
    const changes = entry.changes[0];
    const value = changes.value;
    if (!value || !value.messages || value.messages.length === 0) {
      console.log("ℹ️ Evento sin messages (probablemente statuses). Ignorando.");
      return res.send("EVENT_RECEIVED");
    }

    const messageObject = value.messages; // Contiene los detalles del mensaje si es tipo 'message'

    // Solo procesar si el webhook es un mensaje real (no un evento de estado como 'sent', 'delivered', 'read')
    if (messageObject && messageObject.length > 0) {
      const messages = messageObject[0];
      const typeMessage = messages.type; // Tipo de mensaje (ej: "text", "interactive")
      const textBody = (typeMessage === "text") ? messages.text.body : '';
      let from = messages.from; // Número de teléfono del remitente
      const fromRaw = String(messages.from).replace(/\D/g, "");
      logger.info(`📥 Mensaje recibido de ${fromRaw} (Tipo: ${typeMessage}): ${textBody || 'No es texto'}`);
      const waIdRaw = fromRaw;                 // "5215539689276"
      const waIdE164 = normalizeMxWaId(waIdRaw); // "525539689276"
      const waIdPlus = `+${waIdE164}`; 


      // Preparar los datos del mensaje para el handler
      const messageData = {
        messageId: messages.id,
        from: messages.from,
        type: typeMessage,

        textBody:
          typeMessage === "text"
            ? messages.text.body
            : undefined,

        buttonId:
          typeMessage === "interactive"
            ? messages.interactive?.button_reply?.id ||
              messages.interactive?.list_reply?.id
            : undefined,

        buttonTitle:
          typeMessage === "interactive"
            ? messages.interactive?.button_reply?.title ||
              messages.interactive?.list_reply?.title
            : undefined,
      };


      console.log("🚀 Llamando a handleIncomingMessage con:", messageData);

    await messageHandler.handleIncomingMessage(messageData);

    console.log("✅ handleIncomingMessage terminó OK");

    } else {
      // Log para webhooks que no son de tipo 'message' (ej: estados de mensaje 'sent', 'delivered', 'read')
      logger.info("Evento de WhatsApp recibido (no es un mensaje entrante).");
    }

    res.send("EVENT_RECEIVED"); // Meta espera esta respuesta para confirmar la recepción del webhook
    } catch (e) {
      const msg = e && e.stack ? e.stack : String(e);
      console.error("❌ ERROR CRÍTICO en ReceivedMessage:\n", msg);
      return res.status(500).send(msg); // <-- solo para debug local
    }
};
// --- Fin Función para Recibir y Procesar Mensajes ---

// --- Función Auxiliar: Extraer Texto del Mensaje ---
function GetTextUser(messages) {
  let text = "";
  const typeMessage = messages.type;

  if (typeMessage === "text") {
    text = messages.text.body;
  } else if (typeMessage === "interactive") {
    const interactiveObject = messages.interactive;
    const typeInteractive = interactiveObject.type;

    if (typeInteractive === "button_reply") {
      text = interactiveObject.button_reply.title;
    } else if (typeInteractive === "list_reply") {
      text = interactiveObject.list_reply.title;
    } else {
      logger.warn("Tipo de mensaje interactivo no manejado en GetTextUser.");
    }
  } else {
    logger.warn("Tipo de mensaje no manejado:", typeMessage);
  }
  return text;
}
// --- Fin Función Auxiliar ---

function normalizeMxWaId(rawDigits) {
  const d = String(rawDigits).replace(/\D/g, "");
  // Caso México móvil común en webhooks: 521 + 10 dígitos
  if (d.startsWith("521") && d.length === 13) return "52" + d.substring(3);
  return d;
}
// --- Exportar Funciones del Controlador ---
// Funciones que serán accesibles desde otros módulos (como routes.js)
module.exports = {
  VerifyToken,
  ReceivedMessage,
};