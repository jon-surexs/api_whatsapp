// src/constants/states.js

const STATES = {
  // System
  SYS_MENU: "SYS_MENU",
  SYS_RESET: "SYS_RESET",

  // Module 1 - Intención
  M1_INTENT: "M1_INTENT",
  M1_INFO_END: "M1_INFO_END",
  M1_NOT_TARGET_END: "M1_NOT_TARGET_END",

  // Module 2 - Calificación
  M2_ENTRY: "M2_ENTRY",
  M2_QUAL_Q1: "M2_QUAL_Q1",
  M2_QUAL_END: "M2_QUAL_END",

  // Module 3 - Processing / Handoff
  M3_READY: "M3_READY",
  M3_DONE: "M3_DONE",
};

/**
 * STATE_ALIASES (Regla de oro en V0):
 * - Solo aliasamos estados de "menú/sistema" para unificar entrada.
 * - NO aliasamos estados de flujos (BENEFICIOS_*, etc.) hasta que migremos todo el handler.
 *   (Si lo hacemos, el switch/ifs existentes dejan de coincidir y cae al menú siempre.)
 */
const STATE_ALIASES = {
  // Menú / sistema
  MENU_PRINCIPAL: STATES.SYS_MENU,
};

module.exports = { STATES, STATE_ALIASES };