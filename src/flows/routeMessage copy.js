// src/flows/routeMessage.js

/**
 * ============================================================
 * ROUTE MESSAGE
 * ============================================================
 *
 * Este archivo es el **enrutador central de mensajes**.
 * 
 * Su función principal es decidir **qué motor o flujo procesa el mensaje**
 * y qué respuesta se envía al usuario. Trabaja en conjunto con:
 * 
 * 1) M1 Intent (detector de intención del usuario)
 * 2) M2 Engine (flujo guiado por pasos / campos cerrados)
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

const { handleM1Intent } = require("./m1_intent"); // Motor de intención textual (clasifica mensajes)
const { handleM2Engine } = require("./m2_engine"); // Flujo guiado paso a paso
const { STATES } = require("../constants/states.js"); // Estados globales de la conversación
const { buildMainMenu, buildRescueAmbiguous, backToStartMenu ,buildRescueNoTarget, empresarialMenu} = require("../utils/ui"); // Funciones para construir respuestas
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
  // ESTADO INICIO: M1 INTENT + redirección ESte ya no es valido por que ya pasamos directo SIEMPRE MOSTRAR MENÚ PRINCIPAL 
  // ------------------------------------------------------------
  // if (currentState === STATES.INICIO && type === "text" && textBody) {
  //   // Detecta intención del mensaje con M1
  //   const intentResult = await handleM1Intent({ message: textBody });

  //   logger.info(
  //     `M1 Result -> Intent: ${intentResult.intent} | Confidence: ${intentResult.confidence} | BelowThreshold: ${intentResult.belowThreshold}`
  //   );

  //   if (!intentResult.belowThreshold) {
  //     // Según la intención detectada, enruta a M2 o envía respuesta directa
  //     switch (intentResult.intent) {

  //       case "EMPRESARIAL_BENEFICIOS":
  //       case "EMPRESARIAL_PATRIMONIAL":
  //         // Envia a M2 Engine para flujo guiado
  //         logger.info("Routing to M2 Engine (from INICIO)");
  //         const m2FromInicio = await handleM2Engine({
  //           currentState: STATES.M2_INTAKE,
  //           type,
  //           textBody,
  //           buttonId,
  //           buttonTitle,
  //         });
  //         if (m2FromInicio) return m2FromInicio;

  //       case "NO_TARGET_INDIVIDUAL":
  //         // Respuesta directa para flujo individual (fuera de M2)
  //         logger.info("Redirecting to Individual Flow");
  //         return {
  //           messageToSend: {
  //             type: "text",
  //             text: {
  //               body:
  //                 "Actualmente atendemos seguros empresariales.\n\n" +
  //                 "Si buscas un seguro individual puedes cotizar directamente aquí:\n" +
  //                 "https://tienda.ammia.io/inicio/multi-quote",
  //             },
  //           },
  //           nextState: STATES.SYS_MENU,
  //           mutateConversation: null,
  //         };

  //       case "INFO_SUREXS":
  //         // Información básica de la empresa
  //         logger.info("Sending INFO_SUREXS response");
  //         return {
  //           messageToSend: {
  //             type: "text",
  //             text: { body: "Surexs es especialista en seguros empresariales." },
  //           },
  //           nextState: STATES.SYS_MENU,
  //           mutateConversation: null,
  //         };
  //     }
  //   }

  //   // Si M1 no detecta intención clara, enviamos menú principal
  //   logger.info("No clear intent -> Sending Main Menu");
  //   return {
  //     messageToSend: buildMainMenu(
  //       "¡Hola! Bienvenido a Surexs.\n\n" +
  //         "Somos especialistas en seguros empresariales.\n\n" +
  //         "Selecciona una opción:\n\n" +
  //         "1️⃣ Información sobre Surexs\n" +
  //         "\n" +
  //         "2️⃣ Seguro de Beneficios para empleados (Gastos médicos mayores, Vida, Dental, Visión)\n" +
  //         "\n" +
  //         "3️⃣ Seguro para Flotillas (Autos, motos, camionetas y vehículos pesados de tu empresa)"
  //     ),
  //     nextState: STATES.SYS_MENU,
  //     mutateConversation: null,
  //   };
  // }

  // ------------------------------------------------------------
// ESTADO INICIO: SIEMPRE MOSTRAR MENÚ PRINCIPAL 
// ------------------------------------------------------------
if (currentState === STATES.INICIO && type === "text") {

  logger.info("INICIO -> Sending Main Menu (intent detection disabled)");

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
  // MENSAJES INTERACTIVOS (Botones)
  // ------------------------------------------------------------
  if (type === "interactive") {
    logger.info(`Interactive received -> Button: ${buttonId}`);

    // Primero intento que M2 Engine lo maneje
    const m2 = await handleM2Engine({ currentState, type, textBody, buttonId, buttonTitle });
    if (m2) {
      logger.info("Handled by M2 Engine (interactive)");
      return m2;
    }

    // Si no lo maneja M2, se manejan botones especiales
    switch (buttonId) {
      case "RESCUE_MENU":
        logger.info("Rescue Menu triggered");
        return { messageToSend: buildMainMenu (
          "¡Hola! Bienvenido a Surexs.\n\n" +
          "Somos especialistas en seguros empresariales.\n\n" +
          "Selecciona una opción:\n\n" +
          "1️⃣ Información sobre Surexs\n" +
          "\n" +
          "2️⃣ Seguro de Beneficios para empleados (Gastos médicos mayores, Vida, Dental, Visión)\n" +
          "\n" +
          "3️⃣ Seguro para Flotillas (Autos, motos, camionetas y vehículos pesados de tu empresa)"
        ), nextState: STATES.INICIO, mutateConversation: (conv) => { conv.current_state = STATES.INICIO; },
  };

      case "RESCUE_SOY_EMPRESA":
      case "RESCUE_EMPRESARIAL":
        logger.info("Rescue Empresarial -> Entering M2");
        return {
          messageToSend: empresarialMenu("Bien, ¿Qué tipo de seguro para empresas estas buscando?"),
          nextState: STATES.M2_INTAKE,
          mutateConversation: null,
        };

      case "INFO_SUREXS":
        return { messageToSend: backToStartMenu("Surexs: más que un broker de seguros para empresas.\n\n"+
          "En Surexs, trabajamos con todas las aseguradoras para encontrar la cobertura y precio ideales para tu empresa.\n\n"+
          "Además, te acompañamos durante toda la vigencia, desde la gestión del seguro hasta la resolución de siniestros.\n\n"+
          "\n\n"+
          "Más info: surexs.com")
          , nextState: STATES.SYS_MENU, mutateConversation: null };

      default:
        logger.warn("Unknown interactive button");
        return { messageToSend: buildMainMenu("Opción no reconocida. Elige una opción del menú:"), nextState: STATES.SYS_MENU, mutateConversation: null };
    }
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

    // Lógica para SYS_MENU
    if (currentState === STATES.SYS_MENU) {
      const intentResult = await handleM1Intent({ message: textBody });
      logger.info(
        `SYS_MENU M1 -> Intent: ${intentResult.intent} | Confidence: ${intentResult.confidence} | BelowThreshold: ${intentResult.belowThreshold}`
      );
      if (intentResult.belowThreshold) intentResult.intent = "UNKNOWN";

      switch (intentResult.intent) {
        case "EMPRESARIAL_BENEFICIOS":
        case "EMPRESARIAL_PATRIMONIAL":
          logger.info("SYS_MENU -> Routing to M2");
          const m2FromMenu = await handleM2Engine({ currentState: STATES.M2_INTAKE, type, textBody, buttonId, buttonTitle });
          if (m2FromMenu) return m2FromMenu;

        case "NO_TARGET_INDIVIDUAL":
          logger.info("SYS_MENU -> Redirecting to Individual");
          return {
            messageToSend: {
              type: "text",
              text: {
                body:
                  "¡Claro! 🙌 \nActualmente nos especializamos en seguros empresariales.\n\n" +
                  "Si buscas un seguro individual para tu familia, puedes cotizar aquí: https://tienda.ammia.io/inicio/multi-quote\n\n" +
                  "Si en algún momento necesitas protección para tu empresa, con gusto te ayudamos.",
              },
            },
            nextState: STATES.SYS_MENU,
            mutateConversation: null,
          };

        case "INFO_SUREXS":
          return {
            messageToSend: { type: "text", text: { body: "Surexs es una firma especializada en soluciones de seguros empresariales." } },
            nextState: STATES.SYS_MENU,
            mutateConversation: null,
          };

        case "UNKNOWN":
        default:
          logger.warn("SYS_MENU -> UNKNOWN intent");
          return {
            messageToSend: buildRescueAmbiguous(
              "¿Buscas seguros para una empresa? Si es asi, te apoyamos. Si no, puedes volver al inicio."
            ),
            nextState: STATES.SYS_MENU,
            mutateConversation: null,
          };
      }
    }

    // Fallback M2 Engine en cualquier estado
    const m2 = await handleM2Engine({ currentState, type, textBody, buttonId, buttonTitle });
    if (m2) {
      logger.info("Continuing M2 flow");
      return m2;
    }

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