// src/constants/states.js

const STATES = {
  // Root / system
  INICIO: "INICIO",
  SYS_MENU: "SYS_MENU",
  SYS_RESET: "SYS_RESET",

  // Module 1 - Intent
  M1_INTENT: "M1_INTENT",
  M1_INFO_END: "M1_INFO_END",
  M1_NOT_TARGET_END: "M1_NOT_TARGET_END",

  // Module 2 - Qualification
  M2_ENTRY: "M2_ENTRY",
  M2_INTAKE: "M2_INTAKE",
  M2_CONTACT: "M2_CONTACT",
  M2_DONE: "M2_DONE",
  M2_QUAL_Q1: "M2_QUAL_Q1",
  M2_QUAL_END: "M2_QUAL_END",

  // Module 3 - Processing / Handoff
  M3_READY: "M3_READY",
  M3_DONE: "M3_DONE",
};

const STATE_ALIASES = {
  MENU_PRINCIPAL: STATES.SYS_MENU,
};

module.exports = { STATES, STATE_ALIASES };
