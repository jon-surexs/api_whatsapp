// src/utils/ui.js

const buildMainMenu = (text = "¿Qué puedo hacer por ti hoy?") => ({
  type: "interactive",
  interactive: {
    type: "button",
    body: { text },
    action: {
      buttons: [
        { type: "reply", reply: { id: "INFO_SUREXS", title: "Info sobre Surexs" } },
        { type: "reply", reply: { id: "BENEFICIOS", title: "Beneficios" } },
        { type: "reply", reply: { id: "FLOTILLA", title: "Flotilla" } },
      ],
    },
  },
});

const buildRescueNoTarget = (text = "¿Qué puedo hacer por ti hoy?") => ({
  type: "interactive",
  interactive: {
    type: "button",
    body: { text },
    action: {
      buttons: [
        { type: "reply", reply: { id: "INFO_SUREXS", title: "Info sobre Surexs" } },
        { type: "reply", reply: { id: "BENEFICIOS", title: "Beneficios" } },
        { type: "reply", reply: { id: "FLOTILLA", title: "Flotilla" } },
      ],
    },
  },
});
// // Rescate cuando alguien cae en NO_TARGET
// const buildRescueNoTarget = (text) => ({
//   type: "interactive",
//   interactive: {
//     type: "button",
//     body: { text },
//     action: {
//       buttons: [
//         { type: "reply", reply: { id: "RESCUE_SOY_EMPRESA", title: "Soy empresa" } },
//         { type: "reply", reply: { id: "RESCUE_MENU", title: "Volver al inicio" } },
//       ],
//     },
//   },
// });

// Rescate para mensajes ambiguos: guiar a “empresarial”
const buildRescueAmbiguous = (text) => ({
  type: "interactive",
  interactive: {
    type: "button",
    body: { text },
    action: {
      buttons: [
        { type: "reply", reply: { id: "BENEFICIOS", title: "Beneficios" } },
        { type: "reply", reply: { id: "FLOTILLA", title: "Flotilla" } },
        { type: "reply", reply: { id: "RESCUE_MENU", title: "Volver al inicio" } },
      ],
    },
  },
});
// Rescate para mensajes que dicen ser empresa o querer seguros empresariales
const empresarialMenu = (text) => ({
  type: "interactive",
  interactive: {
    type: "button",
    body: { text },
    action: {
      buttons: [
        { type: "reply", reply: { id: "BENEFICIOS", title: "Beneficios" } },
        { type: "reply", reply: { id: "FLOTILLA", title: "Flotilla" } },
        { type: "reply", reply: { id: "RESCUE_MENU", title: "Volver al inicio" } },
      ],
    },
  },
});

// Rescate para mensajes ambiguos: guiar a “empresarial”
const backToStartMenu = (text) => ({
  type: "interactive",
  interactive: {
    type: "button",
    body: { text },
    action: {
      buttons: [
        { type: "reply", reply: { id: "RESCUE_MENU", title: "Volver al inicio" } },
      ],
    },
  },
});

module.exports = { buildMainMenu, buildRescueNoTarget, buildRescueAmbiguous, backToStartMenu, empresarialMenu };
