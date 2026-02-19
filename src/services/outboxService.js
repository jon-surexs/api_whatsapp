// src/services/outboxService.js
const OutboxLead = require("../models/OutboxLead");

const buildPayloadFromConversation = (userConversation) => {
  const cd = userConversation.conversation_data || {};

  // Construye un payload limpio/operable
  return {
    wa_id: userConversation.wa_id,
    captured_at: new Date().toISOString(),

    // Datos de beneficios (si existen)
    benefits: cd.benefits || null,

    // Contacto (si existe)
    contact: cd.contact || null,

    // Estado final del flujo
    final_state: userConversation.current_state,
  };
};

/**
 * Crea un outbox lead idempotente.
 * - Si ya existe (duplicate key), lo ignora.
 */
const createFromConversation = async ({ userConversation, sourceMessageId, createdFromState }) => {
  if (!userConversation?._id) throw new Error("createFromConversation: userConversation missing _id");
  if (!userConversation?.wa_id) throw new Error("createFromConversation: userConversation missing wa_id");
  if (!sourceMessageId) throw new Error("createFromConversation: missing sourceMessageId");

  const payload = buildPayloadFromConversation(userConversation);

  try {
    const doc = await OutboxLead.create({
      wa_id: userConversation.wa_id,
      source_message_id: sourceMessageId,
      source_conversation_id: userConversation._id,
      module: "M2_BENEFITS_V0",
      status: "NEW",
      payload,
      meta: {
        last_message_text: userConversation.last_message_text || "",
        created_from_state: createdFromState || userConversation.current_state || "",
      },
    });

    return { created: true, doc };
  } catch (err) {
    // duplicate key error (Mongo): ya existe ese outbox lead
    if (err && err.code === 11000) {
      return { created: false, duplicated: true };
    }
    throw err;
  }
};

module.exports = { createFromConversation };
