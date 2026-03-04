// src/constants/states.js

/**
 * Estados oficiales del sistema
 * Versión simplificada MVP (M2 uniproducto)
 */

const STATES = {
  // Root / system
  INICIO: "INICIO",
  SYS_MENU: "SYS_MENU",
  SYS_RESET: "SYS_RESET",

  // Module 1 - Intent
  M1_INTENT: "M1_INTENT",
  M1_INFO_END: "M1_INFO_END",
  M1_NOT_TARGET_END: "M1_NOT_TARGET_END",

  // Module 2 - Qualification (Simplificado)
  M2_INTAKE: "M2_INTAKE",
  M2_CONTACT: "M2_CONTACT",
  M2_DONE: "M2_DONE",
};

const STATE_ALIASES = {
  MENU_PRINCIPAL: STATES.SYS_MENU,
};

module.exports = { STATES, STATE_ALIASES };