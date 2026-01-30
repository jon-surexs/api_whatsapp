// src/models/UserConversation.js
// ------------------------------------------------------------
// Modelo de conversación por usuario (1 doc por wa_id normalizado)
//
// Objetivo:
// - Persistir estado conversacional (current_state)
// - Guardar data estructurada capturada (conversation_data)
// - Control de idempotencia (last_message_id)
// - Debug rápido (last_message_text)
// ------------------------------------------------------------

const mongoose = require("mongoose");

const UserConversationSchema = new mongoose.Schema(
  {
    // Llave ÚNICA normalizada para identificar al usuario siempre igual
    // Ej: "+525539689276"
    wa_id: { type: String, required: true, unique: true, index: true },

    // Opcional: tal como llega del webhook (sin + y con 521...)
    // Útil para debug/auditoría. No se usa como llave.
    wa_id_raw: { type: String, default: null },

    // Estado del flujo (máquina de estados)
    current_state: {
      type: String,
      required: true,
      default: "INICIO",
      index: true, // opcional: ayuda si haces queries por estado
    },

    // Data estructurada capturada durante la conversación
    // Mixed permite guardar cualquier estructura (ideal para piloto).
    conversation_data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Última interacción (para métricas, expiración, etc.)
    last_interaction_at: {
      type: Date,
      default: Date.now,
      index: true, // opcional: ayuda si haces limpieza/expiración
    },

    // Idempotencia: último messageId procesado (evita dobles respuestas)
    last_message_id: {
      type: String,
      default: null,
      index: true, // opcional: útil si quieres auditar duplicados
    },

    // Debug/QA: último texto recibido
    last_message_text: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt
    minimize: false, // IMPORTANTE: conserva objetos vacíos {} (útil para ver conversation_data aunque esté vacío)
  }
);

module.exports = mongoose.model("UserConversation", UserConversationSchema);