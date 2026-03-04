// src/handlers/messageHandler.js

/**
 * ============================================================
 * MESSAGE HANDLER (CEREBRO DEL BOT)
 * ============================================================
 *
 * Este archivo orquesta TODO el flujo conversacional.
 *
 * Es responsable de:
 *
 * 1) Normalizar el wa_id del usuario
 * 2) Cargar o crear la conversación en MongoDB
 * 3) Aplicar idempotencia por messageId (evita respuestas duplicadas)
 * 4) Ejecutar el router (routeMessage)
 * 5) Aplicar mutaciones a la conversación
 * 6) Ejecutar módulo M3 Outbox si corresponde
 * 7) Guardar estado final en BD
 * 8) Enviar respuesta por WhatsApp Cloud API
 *
 * Arquitectura actual:
 *
 * Webhook → handleIncomingMessage →
 *    → routeMessage (M1 intención + M2 engine)
 *    → Mutaciones
 *    → Outbox (M3)
 *    → Save Mongo
 *    → Send WhatsApp message
 *
 * Este handler es el punto central del sistema.
 * NO contiene reglas de negocio directamente.
 * Solo coordina.
 * ============================================================
 */

const { STATES, STATE_ALIASES } = require("../constants/states.js");
const whatsappService = require("../services/whatsappService");
const UserConversation = require("../models/UserConversation");
const logger = require("../utils/logger");
const OutboxLead = require("../models/OutboxLead");
const { sendOutboxLeadEmail } = require("../services/outboxMailer");
const { PAYLOAD_BUILDERS } = require("../flows/m2_engine");
const outboxService = require("../services/outboxService");

const {
  normalizeToWaId,
  ensureConversationData,
} = require("../utils/extractors");

const { routeMessage } = require("../flows/routeMessage");


// ============================================================
// MAIN HANDLER
// ============================================================

const handleIncomingMessage = async (messageData) => {
  /**
   * messageData viene del webhook controller.
   * Estructura esperada:
   *
   * {
   *   messageId,
   *   from,
   *   type,
   *   textBody,
   *   buttonId
   * }
   */

  const { messageId, from, type, textBody, buttonId } = messageData;

  // ------------------------------------------------------------
  // 1) NORMALIZAR WA_ID
  // ------------------------------------------------------------
  // Convierte números tipo +52155... o 52155... en formato consistente
  const wa_id = normalizeToWaId(from);

  logger.info("🧩 handler: wa_id =", wa_id);
  logger.info(`[DBG] inbound: from=${from} wa_id=${wa_id} type=${type} text=${textBody || ""} buttonId=${buttonId || ""} msgId=${messageId || ""}`);


  // ------------------------------------------------------------
  // 2) CARGAR O CREAR CONVERSACIÓN
  // ------------------------------------------------------------

  let userConversation = await UserConversation.findOne({ wa_id });

  logger.info(`[DBG] mongo: found=${!!userConversation} wa_id=${wa_id}`);

  if (!userConversation) {
    // Si no existe conversación previa → se crea nueva
    userConversation = new UserConversation({ wa_id });
    logger.info(`[DBG] mongo: NEW doc default_state=${userConversation.current_state}`);
  } else {
    logger.info(`[DBG] mongo: EXISTING state=${userConversation.current_state}`);
  }


  // ------------------------------------------------------------
  // 2.1) NORMALIZAR ESTADOS LEGACY
  // ------------------------------------------------------------
  // Si existen estados antiguos, se traducen a los nuevos.
  if (userConversation.current_state && STATE_ALIASES[userConversation.current_state]) {
    userConversation.current_state = STATE_ALIASES[userConversation.current_state];
  }

  // Fallback seguro: si el estado viene vacío → menú principal
  if (!userConversation.current_state) {
    userConversation.current_state = STATES.SYS_MENU;
  }

  // Guardamos versión cruda del número (debug / auditoría)
  userConversation.wa_id_raw = String(from);

  // Aseguramos que conversation_data SIEMPRE exista
  ensureConversationData(userConversation);

  // Actualizamos timestamp de última interacción
  userConversation.last_interaction_at = Date.now();


  // ------------------------------------------------------------
  // 3) IDEMPOTENCIA POR messageId
  // ------------------------------------------------------------
  // Meta puede reenviar el mismo webhook.
  // Si ya procesamos ese messageId → no hacemos nada.

  if (messageId && userConversation.last_message_id === messageId) {
    logger.warn(`♻️ Duplicate message detected, ignoring. messageId=${messageId}`);
    return;
  }

  // Registramos último mensaje procesado
  if (messageId) userConversation.last_message_id = messageId;
  if (type === "text" && textBody) {
    userConversation.last_message_text = textBody;
  }


  // ------------------------------------------------------------
  // 4) ROUTER (M1 + M2)
  // ------------------------------------------------------------
  // routeMessage decide:
  // - messageToSend
  // - nextState
  // - mutateConversation()
  // - outboxJob
  // - afterMutate hooks

  logger.info(
    `[DBG] BEFORE routeMessage state=${userConversation.current_state} type=${type}`
  );

  const routeResult = await routeMessage({
    currentState: userConversation.current_state,
    type,
    textBody,
    buttonId,
  });

  const safeResult = routeResult || {};

  let {
    messageToSend = null,
    nextState = userConversation.current_state,
    mutateConversation = null,
    outboxJob = null,
    afterMutate = null,
    afterMutateMessageToSend = null,
  } = safeResult;


  // ------------------------------------------------------------
  // 5) APLICAR MUTACIONES
  // ------------------------------------------------------------
  // mutateConversation permite guardar datos en conversation_data
  // Ejemplo: número de empleados, nombre empresa, etc.

  if (typeof mutateConversation === "function") {
    mutateConversation(userConversation);
  }


  // ------------------------------------------------------------
  // 5.1) HOOKS POST-MUTATE
  // ------------------------------------------------------------
  // Permite recalcular:
  // - nextState
  // - messageToSend
  // - outboxJob
  // Después de haber mutado conversation_data

  if (typeof afterMutate === "function") {
    const post = afterMutate(userConversation) || {};
    if (post.nextState) nextState = post.nextState;
    if (post.messageToSend) messageToSend = post.messageToSend;
    if (post.outboxJob) outboxJob = post.outboxJob;
  }

  // Fallback de mensaje calculado después de mutar conversación
  if (!messageToSend && typeof afterMutateMessageToSend === "function") {
    const postMessage = afterMutateMessageToSend(userConversation);
    if (postMessage) messageToSend = postMessage;
  }


  // ------------------------------------------------------------
  // 6) M3 OUTBOX (LEADS / HANDOFF)
  // ------------------------------------------------------------
  // Solo se ejecuta si el router lo solicita mediante outboxJob

  if (outboxJob) {

    // Validación estricta del contrato
    if (!outboxJob.module || !outboxJob.payload_builder) {
      logger.error("❌ Invalid outboxJob contract.");
      return;
    }

    // Idempotencia adicional: evitar duplicados en Outbox
    const exists = await OutboxLead.findOne({
      source_message_id: messageId,
      module: outboxJob.module,
    }).lean();

    if (!exists) {

      // Validar que el payload builder exista
      const builder = PAYLOAD_BUILDERS[outboxJob.payload_builder];

      if (!builder) {
        logger.error(`❌ Payload builder not found: ${outboxJob.payload_builder}`);
        return;
      }

      // Construir payload final
      const payload = builder({
        userConversation,
        product: { handoff: { final_state: outboxJob.final_state } },
      });

      // Crear documento Outbox
      const createdDoc = await OutboxLead.create({
        wa_id: userConversation.wa_id,
        source_message_id: messageId,
        source_conversation_id: userConversation._id,
        module: outboxJob.module,
        status: "NEW",
        payload,
        meta: {
          last_message_text: userConversation.last_message_text || "",
          created_from_state: userConversation.current_state,
        },
      });

      // Intentar enviar email
      try {
        const { skipped, messageId: emailMessageId } =
          await sendOutboxLeadEmail(createdDoc);

        if (!skipped) {
          await OutboxLead.updateOne(
            { _id: createdDoc._id },
            {
              $set: {
                status: "SENT_EMAIL",
                "meta.email_message_id": emailMessageId || "",
                "meta.email_sent_at": new Date().toISOString(),
              },
            }
          );
        }
      } catch (e) {
        await OutboxLead.updateOne(
          { _id: createdDoc._id },
          {
            $set: {
              status: "ERROR",
              "meta.email_error": String(e?.message || e),
              "meta.email_failed_at": new Date().toISOString(),
            },
          }
        );
      }
    }
  }


  // ------------------------------------------------------------
  // 7) ACTUALIZAR ESTADO Y GUARDAR EN BD
  // ------------------------------------------------------------

  userConversation.current_state = nextState;

  await userConversation.save();


  // ------------------------------------------------------------
  // 8) VALIDACIÓN FINAL
  // ------------------------------------------------------------

  if (!messageToSend) {
    logger.warn("⚠️ messageToSend quedó null. No envío nada.");
    return;
  }


  // ------------------------------------------------------------
  // 9) ENVIAR RESPUESTA A WHATSAPP
  // ------------------------------------------------------------

  await whatsappService.SendWhatsAppMessage(wa_id, messageToSend);

  logger.info("✅ Respuesta enviada.");
};

module.exports = { handleIncomingMessage };