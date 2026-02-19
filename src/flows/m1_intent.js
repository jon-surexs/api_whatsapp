// src/flows/m1_intent.js

const { classifyIntent, CONFIDENCE_THRESHOLD } = require("../services/intentClassifierService");
const logger = require("../utils/logger");

async function handleM1Intent({ message }) {
  const result = classifyIntent(message);

  logger.info(
    `🧠 M1 Intent → intent=${result.intent} | confidence=${result.confidence} | threshold=${CONFIDENCE_THRESHOLD} | belowThreshold=${result.belowThreshold}`
  );

  return result;
}

module.exports = {
  handleM1Intent
};
