// src/flows/m1_intent.js
const { STATES } = require("../constants/states");
const { buildRescueNoTarget } = require("../utils/ui");

// Palabras clave simples V1 (sin IA)
const GREETING_PATTERNS = [
  /^hola+$/i,
  /^holahola+$/i,
  /^buen(as)?\s*(d[ií]as|tardes|noches)$/i,
  /^hey$/i,
  /^que\s*tal$/i,
  /^hi$/i,
];

const PERSONAL_PATTERNS = [
  /\bseguro\w*\s*(de|para)?\s*(auto|autos|carro|carros|coche|coches)\b/i,
  /\b(1|un|una)\s*(auto|carro|coche)\b/i,
  /para\s*mi\b/i,
  /soy\s*particular/i,
  /mi\s*carro/i,
  /mi\s*familia/i,
];

const EMPRESARIAL_PATTERNS = [
  /empresa/i,
  /empleados?/i,
  /colaboradores?/i,
  /beneficios?/i,
  /flotilla/i,
  /corporativ/i,
  /gmm/i,
  /gastos\s*m[eé]dicos/i,
];

const INFO_PATTERNS = [
  /qu[eé]\s*es\s*surexs/i,
  /qu[eé]\s*hacen/i,
  /informaci[oó]n/i,
  /servicios?/i,
  /sobre\s*surexs/i,
];

const matchesAny = (text, patterns) => {
  return patterns.some((rx) => rx.test(text));
};

/**
 * Módulo 1 – Intención
 * Solo se activa cuando estamos en SYS_MENU y llega texto libre.
 */
const handleM1Intent = ({ currentState, type, textBody }) => {
  if (type !== "text") return null;
  if (currentState !== STATES.SYS_MENU) return null;

    const raw = (textBody || "").trim();

  // Normalización básica para tolerar typos simples:
  // - lower
  // - colapsar espacios múltiples
  // - separar casos tipo "seguronpara" -> "seguro npara" no es perfecto, pero ayuda
  const text = raw
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " "); // quita signos raros, deja letras/números/espacios

  if (!text) return null;

    if (matchesAny(text, GREETING_PATTERNS)) {
    return {
      messageToSend: {
        type: "text",
        text: { body: "Hola 🙂 Elige una opción del menú o dime qué necesitas (solo empresas)." },
      },
      nextState: STATES.SYS_MENU,
      mutateConversation: null,
    };
  }

  // 1️⃣ Detectar No Target (patrimonial / individual)
  if (matchesAny(text, PERSONAL_PATTERNS)) {
    return {
      messageToSend: buildRescueNoTarget(
        "Gracias por escribirnos. Este canal es para programas corporativos (empresas).\n\n" +
        "Si sí eres empresa, toca “Soy empresa”. Si no, vuelve al menú."
        ),
      nextState: "NO_CALIFICADO",
      mutateConversation: null,
    };
  }

  // 2️⃣ Detectar Empresarial
  if (matchesAny(text, EMPRESARIAL_PATTERNS)) {
    return {
      messageToSend: {
        type: "text",
        text: {
          body:
            "Perfecto. Te apoyo con programas corporativos.\n\n" +
            "¿Cuántos empleados tiene tu empresa y qué tipo de seguro están buscando?",
        },
      },
      nextState: "BENEFICIOS_PREGUNTA_1", // redirigimos directo a M2 por ahora
      mutateConversation: null,
    };
  }

  // 3️⃣ Detectar Info general
  if (matchesAny(text, INFO_PATTERNS)) {
    return {
      messageToSend: {
        type: "text",
        text: {
          body:
            "Surexs es un broker especializado en seguros corporativos para empresas medianas y grandes.\n\n" +
            "Si buscas implementar beneficios o programas de seguros empresariales, con gusto te apoyamos.",
        },
      },
      nextState: STATES.SYS_MENU,
      mutateConversation: null,
    };
  }

  // 4️⃣ Si no clasificamos, devolvemos null para que el router siga normal
  return null;
};

module.exports = { handleM1Intent };
