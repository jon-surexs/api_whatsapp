// src/flows/routeMessage.js

/**
 * ============================================================
 * ROUTE MESSAGE
 * ============================================================
 *
 * Este archivo es el **enrutador central de mensajes**.
 * 
 * Su función principal es decidir qué respuesta guiada por botones
 * se envía al usuario y cuándo delegar al M2 Engine.
 *
 * M1 Intent fue removido del runtime activo. El chatbot ahora es
 * button-driven: UI/Menu -> M2 Engine -> Products -> Outbox.
 * M2 es el único motor conversacional activo.
 *
 * Recibe el mensaje desde el handler principal (messageHandler.js):
 *    handleIncomingMessage → routeMessage
 * 
 * Lo que regresa:
 *    {
 *       messageToSend: objeto listo para WhatsApp,
 *       nextState: próximo estado del usuario,
 *       mutateConversation: función opcional para mutar datos internos de la conversación
 *    }
 *
 * Este archivo **no envía mensajes directamente**, solo devuelve instrucciones
 * al handler, que se encarga de persistir la conversación y enviar el mensaje.
 * ============================================================
 */

const { handleM2Engine } = require("./m2_engine"); // Flujo guiado paso a paso
const { STATES } = require("../constants/states.js"); // Estados globales de la conversación
const { buildMainMenu, infoSurexs, cotizarSeguros} = require("../utils/ui"); // Funciones para construir respuestas
const logger = require("../logger");

/**
 * routeMessage
 * 
 * Enruta el mensaje según el estado actual y tipo de entrada.
 * 
 * @param {Object} params
 * @param {string} params.currentState - Estado actual de la conversación (UserConversation.current_state)
 * @param {string} params.type - Tipo de mensaje recibido: 'text' | 'interactive'
 * @param {string} [params.textBody] - Contenido de texto si es tipo 'text'
 * @param {string} [params.buttonId] - ID del botón si es tipo 'interactive'
 * @param {string} [params.buttonTitle] - Título del botón interactivo
 * 
 * @returns {Promise<Object>} 
 *    Contiene { messageToSend, nextState, mutateConversation }
 */
const routeMessage = async ({ currentState, type, textBody, buttonId, buttonTitle }) => {

  // ------------------------------------------------------------
  // LOG GLOBAL DE ENTRADA
  // ------------------------------------------------------------
  logger.info(
    `Incoming -> State: ${currentState} | Type: ${type} | Text: ${textBody || "N/A"} | Button: ${buttonId || "N/A"}`
  );

  // Función opcional para mutar datos internos de la conversación
  let mutateConversation = null;

  // ------------------------------------------------------------
  // RESET AUTOMÁTICO DESDE M2_DONE
  // ------------------------------------------------------------
  // Si el usuario terminó un flujo M2 y envía texto, reiniciamos al inicio.
  if (currentState === STATES.M2_DONE && type === "text") {
    logger.info("Reset automático desde M2_DONE a INICIO");

    currentState = STATES.INICIO;
    mutateConversation = (conv) => {
      conv.current_state = STATES.INICIO;
      conv.conversation_data = conv.conversation_data || {};
      // Limpiamos datos previos de M2
      if (conv.conversation_data.m2) delete conv.conversation_data.m2;
      if (typeof conv.markModified === "function") conv.markModified("conversation_data");
    };
  }


  // ------------------------------------------------------------
// ESTADO INICIO: SIEMPRE MOSTRAR MENÚ PRINCIPAL 
// ------------------------------------------------------------
if (currentState === STATES.INICIO && type === "text") {

  logger.info("INICIO -> Sending Main Menu (button-driven flow)");

  return {
    messageToSend: buildMainMenu(
      "¡Hola! Soy el asistente de Surexs.\n\n" +
      "Somos especialistas en seguros empresariales.\n\n" +
      "Selecciona una opción para poder ayudarte:\n\n" +
      "1️⃣ Cotizar seguros para empresas (Beneficios, Flotillas, Daños y RC)\n\n" +
      "2️⃣ Información sobre Surexs\n\n" +
      "3️⃣ Quiero contactar un asesor"
    ),
    nextState: STATES.SYS_MENU,
    mutateConversation: null,
  };
}

  // ------------------------------------------------------------
  // MENSAJES INTERACTIVOS (Botones) AQUI MANEJAMOS LAS RESPUESTAS SEGUN LO QUE PRESIONE EL USUARIO
  // ------------------------------------------------------------
  if (type === "interactive") {
    logger.info(`Interactive received -> Button: ${buttonId}`);

    // Primero intento que M2 Engine lo maneje
    const m2 = await handleM2Engine({ currentState, type, textBody, buttonId, buttonTitle });
    if (m2) {
      logger.info("Handled by M2 Engine (interactive)");
      return m2;
    }

    // SWITCH DE CASOS SEGUN LO SELECCIONADO
    switch (buttonId) {
      // CASE: INFO_SUREXS
       case "INFO_SUREXS":
        return { messageToSend: infoSurexs(
          "Surexs: más que un broker de seguros para empresas.\n\n"+
          "En Surexs, trabajamos con todas las aseguradoras para encontrar la cobertura y precio ideales para tu empresa.\n\n"+
          "Además, te acompañamos durante toda la vigencia, desde la gestión del seguro hasta la resolución de siniestros.\n\n"+
          "\n\n"+
          "Más info: surexs.com")
          , nextState: STATES.SYS_MENU, mutateConversation: null };


          
      // CASE: COTIZAR SEGUROS
       case "COTIZAR_SEGUROS":
        return { messageToSend: cotizarSeguros(
          "Selecciona que tipo de seguro para empresas que quieres cotizar:\n\n"+
          "1️⃣ Seguro de Beneficios para empleados (Gastos médicos mayores, Vida, Dental, Visión)\n\n"+
          "2️⃣ Seguro para Flotillas (Autos, motos, camionetas y vehículos pesados de tu empresa)\n\n"+
          "3️⃣ Otros seguros (Daños y Responsabilidad Civil, Seguro contra incendios, etc.)\n\n"
         )
          , nextState: STATES.SYS_MENU, mutateConversation: null };





      case "RESCUE_MENU":
        logger.info("Rescue Menu triggered");
        return { messageToSend: buildMainMenu (
        
      "¡Hola! Soy el asistente de Surexs.\n\n" +
      "Somos especialistas en seguros empresariales.\n\n" +
      "Selecciona una opción para poder ayudarte:\n\n" +
      "1️⃣ Cotizar seguros para empresas (Beneficios, Flotillas, Daños y RC)\n\n" +
      "2️⃣ Información sobre Surexs\n\n" +
      "3️⃣ Quiero contactar un asesor"
        ), nextState: STATES.INICIO, mutateConversation: (conv) => { conv.current_state = STATES.INICIO; },
      };

      
     

      default:
        logger.warn("Unknown interactive button");
        return { messageToSend: buildMainMenu("Opción no reconocida. Elige una opción del menú:"), nextState: STATES.SYS_MENU, mutateConversation: null };
    }
  }


// Fallback M2 Engine en cualquier estado
    const m2 = await handleM2Engine({ currentState, type, textBody, buttonId, buttonTitle });
    if (m2) {
      logger.info("Continuing M2 flow");
      return m2;
    }


  // ------------------------------------------------------------
  // MENSAJES DE TEXTO EN ESTADOS VARIOS
  // ------------------------------------------------------------
  if (type === "text") {
    const lower = (textBody || "").trim().toLowerCase();

    // Reset manual de menú
    if (["menu", "menú", "inicio", "reset"].includes(lower)) {
      logger.info("Manual menu/reset triggered");
      return { messageToSend: buildMainMenu(), nextState: STATES.SYS_MENU, mutateConversation };
    }

    // M1 Intent ya no clasifica texto libre en SYS_MENU.
    // Fuera de M2, el bot vuelve al menú para mantener el flujo guiado por botones.

    // Última opción: menú principal
    logger.info("Fallback -> Sending Main Menu");
    return { messageToSend: buildMainMenu("Elige una opción del menú:"), nextState: STATES.SYS_MENU, mutateConversation: null };
  }

  // ------------------------------------------------------------
  // TIPOS NO SOPORTADOS
  // ------------------------------------------------------------
  logger.warn("Unsupported message type received");
  return { messageToSend: { type: "text", text: { body: "Por ahora solo procesamos texto o botones." } }, nextState: currentState, mutateConversation: null };
};

module.exports = { routeMessage };
