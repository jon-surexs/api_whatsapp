// testClassifier.js
const { classifyIntent, CONFIDENCE_THRESHOLD, INTENTS } = require("./src/services/intentClassifierService");

// Lista de mensajes de prueba con el intent esperado
const testMessages = [
  { msg: "asdfasdfasdf", expected: INTENTS.UNKNOWN },
  { msg: "¡Hola! 👋 Bienvenido a Surexs. ¿Cómo puedo ayudarte hoy?", expected: INTENTS.UNKNOWN },
  { msg: "Beneficios(GMM)", expected: INTENTS.EMPRESARIAL_BENEFICIOS },
  { msg: "no", expected: INTENTS.UNKNOWN },
  { msg: "Somos 35 y queremos GMM + Dental", expected: INTENTS.EMPRESARIAL_BENEFICIOS },
  { msg: "Juan, RH, ACME, juan@acme.com", expected: INTENTS.UNKNOWN },
  { msg: "😂🔥🚀", expected: INTENTS.UNKNOWN },
  { msg: "a", expected: INTENTS.UNKNOWN },
  { msg: "somos 2  y queremos dental", expected: INTENTS.EMPRESARIAL_BENEFICIOS },
  { msg: "Quiero seguro para mí", expected: INTENTS.NO_TARGET_INDIVIDUAL },
  { msg: "sa", expected: INTENTS.UNKNOWN },
  { msg: "Somos 5 y queremos GMM + Dental", expected: INTENTS.EMPRESARIAL_BENEFICIOS },
  { msg: "Somos 3 y queremos GMM + Dental", expected: INTENTS.EMPRESARIAL_BENEFICIOS },
  { msg: "Somos 35 y queremos GMM + Denta", expected: INTENTS.EMPRESARIAL_BENEFICIOS }
];

// Función para mostrar resultados en formato tabla
function printResults(messages) {
  console.log("=".repeat(110));
  console.log(
    "| Mensaje".padEnd(40) +
    "| Intent".padEnd(25) +
    "| Confidence".padEnd(12) +
    "| Threshold OK".padEnd(12) +
    "| Correct Intent |"
  );
  console.log("-".repeat(110));

  messages.forEach(({ msg, expected }) => {
    const result = classifyIntent(msg);
    const passThreshold = result.confidence >= CONFIDENCE_THRESHOLD ? "YES" : "NO";
    const intentCorrect = result.intent === expected ? "YES" : "NO";

    console.log(
      "| " + msg.padEnd(38) +
      "| " + result.intent.padEnd(23) +
      "| " + result.confidence.toFixed(2).padEnd(10) +
      "| " + passThreshold.padEnd(12) +
      "| " + intentCorrect.padEnd(14) +
      "|"
    );
  });

  console.log("=".repeat(110));
}

// Ejecutar
printResults(testMessages);
