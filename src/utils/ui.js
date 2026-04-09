// src/utils/ui.js

const buildMainMenu = (text = "¿Qué puedo hacer por ti hoy?") => ({
  type: "interactive",
  interactive: {
    // header: {
    //   "type": "image",
    //   "image": {
    //     "id": "2762702990552401"
    //   }},
    type: "button",
    body: { text },
    footer: {
      "text": "Soy un footer que podemos usar"
    },
    action: {
      buttons: [
        { type: "reply", reply: { id: "COTIZAR_SEGUROS", title: "Cotizar seguros" } },
        { type: "reply", reply: { id: "INFO_SUREXS", title: "Info sobre Surexs" } },
        { type: "reply", reply: { id: "CONTACT_ADVISOR", title: "Contactar asesor" } },
      ],
    },
  },
});


// MENSAJE PARA INFO SUREXS
const infoSurexs = (text) => ({
  type: "interactive",
  interactive: {
    type: "button",
    body: { text },
    action: {
      buttons: [
        { type: "reply", reply: { id: "COTIZAR_SEGUROS", title: "Cotizar seguro" } },
        { type: "reply", reply: { id: "RESCUE_MENU", title: "Volver al inicio" } },
      ],
    },
  },
});


// Rescate para mensajes ambiguos: guiar a “empresarial”
const cotizarSeguros = (text) => ({
  type: "interactive",
  interactive: {
    type: "button",
    body: { text },
    action: {
      buttons: [
        { type: "reply", reply: { id: "BENEFITS", title: "Beneficios" } },
        { type: "reply", reply: { id: "FLEET", title: "Flotillas" } },
        { type: "reply", reply: { id: "OTHER_INSURANCE", title: "Otros seguros" } },
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




module.exports = { buildMainMenu, infoSurexs, cotizarSeguros };
