// src/services/intentClassifierService.js

// 🔹 Lista cerrada de intents
const INTENTS = {
  EMPRESARIAL_BENEFICIOS: "EMPRESARIAL_BENEFICIOS",
  EMPRESARIAL_PATRIMONIAL: "EMPRESARIAL_PATRIMONIAL",
  NO_TARGET_INDIVIDUAL: "NO_TARGET_INDIVIDUAL",
  INFO_SUREXS: "INFO_SUREXS",
  UNKNOWN: "UNKNOWN"
};

// 🔹 Umbral de confianza
const CONFIDENCE_THRESHOLD = 0.7;
const BENEFICIOS_KEYWORDS = [
  "gmm",
  "gastos médicos",
  "seguro médico",
  "beneficios",
  "empleados",
  "empresa",
  "colaboradores",
  "vida grupo",
  "dental empresarial"
];

const PATRIMONIAL_KEYWORDS = [
  "flotilla",
  "autos empresa",
  "seguro empresarial",
  "daños",
  "responsabilidad civil"
];

const INDIVIDUAL_KEYWORDS = [
  "seguro para mi",
  "para mi",
  "seguro personal",
  "seguro individual",
  "para mi familia"
];
function containsKeyword(text, keywords) {
  return keywords.some(keyword => text.includes(keyword));
}

function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .toLowerCase();
}
function classifyIntent(rawMessage = "") {
  const message = rawMessage.toLowerCase().trim();

  if (!message) {
    return {
      intent: INTENTS.UNKNOWN,
      confidence: 0.1,
      belowThreshold: true
    };
  }

  let result = { intent: INTENTS.UNKNOWN, confidence: 0.3 };

  if (containsKeyword(message, BENEFICIOS_KEYWORDS)) {
    result = { intent: INTENTS.EMPRESARIAL_BENEFICIOS, confidence: 0.9 };
  }
  else if (containsKeyword(message, PATRIMONIAL_KEYWORDS)) {
    result = { intent: INTENTS.EMPRESARIAL_PATRIMONIAL, confidence: 0.85 };
  }
  else if (containsKeyword(message, INDIVIDUAL_KEYWORDS)) {
    result = { intent: INTENTS.NO_TARGET_INDIVIDUAL, confidence: 0.9 };
  }
  else if (message.includes("qué es surexs") || message.includes("quienes son")) {
    result = { intent: INTENTS.INFO_SUREXS, confidence: 0.8 };
  }

  // 🔥 Aplicar threshold de fallback
  const belowThreshold = result.confidence < CONFIDENCE_THRESHOLD;
  return {
    intent: belowThreshold ? INTENTS.UNKNOWN : result.intent,
    confidence: result.confidence,
    belowThreshold
  };
}


module.exports = {
  classifyIntent,
  CONFIDENCE_THRESHOLD,
  INTENTS
};

