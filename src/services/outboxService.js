// src/services/outboxService.js

/**
 * Modelo único de almacenamiento de leads.
 * Toda la información capturada por M2 se guarda en esta colección.
 */
const OutboxLead = require("../models/OutboxLead");

const buildPayloadFromConversation = (userConversation) => {

  const m2 = userConversation.conversation_data?.m2 || {};

  return {
    wa_id: userConversation.wa_id,
    captured_at: new Date().toISOString(),

    product: m2.product || null,
    qualification_status: m2.qualificationStatus || null,
    lead_priority: m2.leadPriority || null,

    answers: m2.answers || {},

    contact: m2.contact || null,

    final_state: userConversation.current_state
  };

};

/**
 * Crea un outbox lead idempotente.
 * Este documento es la fuente única de los leads capturados.
 */
const createFromConversation = async ({ userConversation, sourceMessageId, createdFromState }) => {

  const payload = buildPayloadFromConversation(userConversation);

  try {

    const doc = await OutboxLead.create({
      wa_id: userConversation.wa_id,
      source_message_id: sourceMessageId,
      source_conversation_id: userConversation._id,
      module: "M2_ENGINE",
      status: "NEW",
      payload,
      meta: {
        last_message_text: userConversation.last_message_text || "",
        created_from_state: createdFromState || userConversation.current_state || "",
      },
    });

    return { created: true, doc };

  } catch (err) {

    if (err && err.code === 11000) {
      return { created: false, duplicated: true };
    }

    throw err;

  }

};
module.exports = { createFromConversation };