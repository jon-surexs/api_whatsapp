// src/models/OutboxLead.js
const mongoose = require("mongoose");

const OutboxLeadSchema = new mongoose.Schema(
  {
    // Identidad / idempotencia
    wa_id: { type: String, required: true, index: true },
    source_message_id: { type: String, required: true }, // messageId que disparó el "FIN"
    source_conversation_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    // Contexto
    module: { type: String, default: "M2_BENEFITS_V0" }, // etiqueta (por ahora)
    status: {
      type: String,
      enum: ["NEW", "SENT_EMAIL", "DONE", "ERROR"],
      default: "NEW",
      index: true,
    },

    // Payload estructurado (para operar fuera de WhatsApp)
    payload: {
      type: Object,
      default: {},
    },

    // Auditoría / debug
    meta: {
      last_message_text: { type: String, default: "" },
      created_from_state: { type: String, default: "" }, // e.g. BENEFICIOS_FIN
    },
  },
  { timestamps: true, minimize: false }
);

// ✅ Idempotencia dura: mismo usuario + mismo messageId no crea duplicados
OutboxLeadSchema.index({ wa_id: 1, source_message_id: 1 }, { unique: true });

module.exports = mongoose.model("OutboxLead", OutboxLeadSchema);
