// src/handlers/messageHandler.js
// ------------------------------------------------------------
// Este handler es el "cerebro" del bot:
// 1) Normaliza wa_id
// 2) Carga/crea conversación en Mongo
// 3) Idempotencia por messageId (evita duplicados)
// 4) Decide respuesta según estado + tipo de mensaje
// 5) Guarda estado/datos y envía respuesta por WhatsApp API
//
// Fix principal para tu caso ("no sale conversation_data"):
// - Asegurar que conversation_data exista SIEMPRE (aunque sea {})
// - Marcar cambios en subdocumentos Mixed (markModified)
// - NO hacer un save “temprano” que te deje el doc con {} y luego no se refresque en Compass
//   (igual puedes hacerlo, pero aquí lo dejamos robusto y claro)
// ------------------------------------------------------------
// import { STATES, STATE_ALIASES } from "../constants/states.js";
// src/handlers/messageHandler.js
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

// ------------------------------------------------------------
// MAIN HANDLER
// ------------------------------------------------------------
const handleIncomingMessage = async (messageData) => {
  const { messageId, from, type, textBody, buttonId } = messageData;

  const wa_id = normalizeToWaId(from);
  logger.info("🧩 handler: wa_id =", wa_id);
  logger.info(`[DBG] inbound: from=${from} wa_id=${wa_id} type=${type} text=${textBody || ""} buttonId=${buttonId || ""} msgId=${messageId || ""}`);


  // 1) Cargar / crear conversación
  let userConversation = await UserConversation.findOne({ wa_id });
  logger.info(`[DBG] mongo: found=${!!userConversation} wa_id=${wa_id}`);

  if (!userConversation) {
    userConversation = new UserConversation({ wa_id });
    logger.info(`[DBG] mongo: NEW doc default_state=${userConversation.current_state}`);

  } else {
    logger.info(`[DBG] mongo: EXISTING state=${userConversation.current_state}`);
  }
   // 1.0) Normaliza estados legacy a la nueva convención (sin romper BD actual)
  if (userConversation.current_state && STATE_ALIASES[userConversation.current_state]) {
    userConversation.current_state = STATE_ALIASES[userConversation.current_state];
  }

  // Si por alguna razón current_state viene vacío, caemos a menú
  if (!userConversation.current_state) {
    userConversation.current_state = STATES.SYS_MENU;
  }

  // 1.1) Guardar wa_id_raw (solo debug/auditoría)
  userConversation.wa_id_raw = String(from);

  // 1.2) Asegurar conversation_data (para que exista desde el primer save)
  ensureConversationData(userConversation);

  // 1.3) Timestamp de interacción (siempre)
  userConversation.last_interaction_at = Date.now();

  // 2) Idempotencia por messageId:
  // Si Meta reintenta el mismo webhook, ignoramos para no responder 2 veces.
  if (messageId && userConversation.last_message_id === messageId) {
    logger.warn(`♻️ Duplicate message detected, ignoring. messageId=${messageId}`);
    return;
  }

  // Registramos messageId y último texto (sin hacer "save temprano" obligatorio).
  // OJO: si se cae el proceso antes del save final, podrías reprocesar,
  // pero por simplicidad dejamos un solo save final (más claro) y sigue siendo robusto.
  if (messageId) userConversation.last_message_id = messageId;
  if (type === "text" && textBody) userConversation.last_message_text = textBody;

  // 3) Router (decide respuesta + nextState + mutaciones opcionales)
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

  logger.info(
    `[DBG] AFTER routeMessage nextState=${nextState} willSend=${messageToSend?.type || "null"}`
  );
  logger.info(
    `[DBG] routeMessage result → nextState=${nextState} hasMutate=${typeof mutateConversation === "function"} hasOutbox=${!!outboxJob}`
  );
  logger.info(
    `[DBG routeMessage input] state=${userConversation.current_state} type=${type} text=${textBody} buttonId=${buttonId}`
  );
  logger.info(
    `[DBG] BEFORE mutate → state=${userConversation.current_state} data=${JSON.stringify(userConversation.conversation_data || {})}`
  );
  // 4) Aplicar mutaciones de data (si hubo)
  if (typeof mutateConversation === "function") {
    mutateConversation(userConversation);
    logger.info(
      `[DBG] AFTER mutate → data=${JSON.stringify(userConversation.conversation_data || {})}`
    );
  }



  // ✅ M3 Outbox (solo cuando el router lo pide)
  // 4.1) Hooks post-mutate (si los retorna el router/engine)
  if (typeof afterMutate === "function") {
    const post = afterMutate(userConversation) || {};
    if (post.nextState) nextState = post.nextState;
    if (post.messageToSend) messageToSend = post.messageToSend;
    if (post.outboxJob) outboxJob = post.outboxJob;
  }

  // 4.2) Fallback de mensaje calculado despu�s de mutar conversaci�n
  if (!messageToSend && typeof afterMutateMessageToSend === "function") {
    const postMessage = afterMutateMessageToSend(userConversation);
    if (postMessage) messageToSend = postMessage;
  }

  if (outboxJob?.module && messageId) {
    // idempotencia: si ya existe outbox para ese messageId + module, no duplicar
    const exists = await OutboxLead.findOne({
      source_message_id: messageId,
      module: outboxJob.module,
    }).lean();

    if (!exists) {
      const builder = PAYLOAD_BUILDERS[outboxJob.payload_builder];

      const payload = builder
        ? builder({ userConversation, product: { handoff: { final_state: outboxJob.final_state } } })
        : {
            wa_id: userConversation.wa_id,
            captured_at: new Date().toISOString(),
            conversation_data: userConversation.conversation_data || {},
            final_state: outboxJob.final_state || userConversation.current_state,
          };

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

      logger.info(`📤 Outbox created: module=${outboxJob.module} msgId=${messageId}`);

      // ✅ Enviar email y marcar status
      try {
        const { skipped, messageId: emailMessageId } = await sendOutboxLeadEmail(createdDoc);

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
          logger.info(`📧 Email SENT: outbox=${createdDoc._id} messageId=${emailMessageId || ""}`);
        } else {
          logger.info(`📧 Email skipped (EMAIL_ENABLED=false): outbox=${createdDoc._id}`);
        }
      } catch (e) {
        await OutboxLead.updateOne(
          { _id: createdDoc._id },
          {
            $set: {
              status: "EMAIL FAILED",
              "meta.email_error": String(e?.message || e),
              "meta.email_failed_at": new Date().toISOString(),
            },
          }
        );
        logger.error(`📧 Email ERROR: outbox=${createdDoc._id} err=${String(e?.message || e)}`);
      }
  }}
  logger.info(
    `[DBG] ABOUT TO SAVE → newState=${nextState} dataKeys=${Object.keys(userConversation.conversation_data || {}).join(",")}`
  );

  // 5) Actualizar estado
  userConversation.current_state = nextState;

  // 5.1) Guardar DB
  await userConversation.save();
  logger.info(
    `[DBG] AFTER save → state=${userConversation.current_state}`
  );
  logger.info(
    `[DBG] AFTER save → data=${JSON.stringify(userConversation.conversation_data || {})}`
  );



    // M3 OUTBOX: si terminamos el flujo de Beneficios, generamos un registro operable
  if (nextState === "BENEFICIOS_FIN" && messageId) {
    const res = await outboxService.createFromConversation({
      userConversation,
      sourceMessageId: messageId,
      createdFromState: "BENEFICIOS_FIN",
    });

    if (res.created) {
      logger.info(`📦 OutboxLead creado (wa_id=${wa_id}, messageId=${messageId})`);
    } else {
      logger.info(`📦 OutboxLead ya existía (idempotente) (wa_id=${wa_id}, messageId=${messageId})`);
    }
  }


  // 6) Validación final antes de enviar
  if (!messageToSend) {
    logger.warn("⚠️ messageToSend quedó null. No envío nada para evitar crash.");
    return;
  }

  // 7) Enviar respuesta
  logger.info(
  `[DBG] SENDING → wa_id=${wa_id} payload=${JSON.stringify(messageToSend)}`
  );
  await whatsappService.SendWhatsAppMessage(wa_id, messageToSend);
  logger.info("✅ Respuesta enviada.");

  
};

module.exports = { handleIncomingMessage };
