// src/flows/routeMessage.js
const { handleM1Intent } = require("./m1_intent");
const { handleM2Engine } = require("./m2_engine");

const { STATES } = require("../constants/states.js");
const { buildMainMenu, buildRescueAmbiguous } = require("../utils/ui");

// ✅ LOGGER AGREGADO (sube dos niveles porque estamos en src/flows)
const logger = require("../logger");

const routeMessage = async ({ currentState, type, textBody, buttonId }) => {

  // ✅ LOG DE ENTRADA GLOBAL
  logger.info(
    `Incoming -> State: ${currentState} | Type: ${type} | Text: ${textBody || "N/A"} | Button: ${buttonId || "N/A"}`
  );

  let mutateConversation = null;

  /**
   * 🔥 RESET AUTOMÁTICO SI YA ESTABA EN M2_DONE
   */
  if (currentState === STATES.M2_DONE && type === "text") {
    logger.info("Reset automático desde M2_DONE a INICIO");

    currentState = STATES.INICIO;

    mutateConversation = (conv) => {
      conv.current_state = STATES.INICIO;
      conv.conversation_data = conv.conversation_data || {};
      if (conv.conversation_data.m2) {
        delete conv.conversation_data.m2;
        if (typeof conv.markModified === "function") {
          conv.markModified("conversation_data");
        }
      }
    };
  }

  // A) Estado INICIO
  if (currentState === STATES.INICIO) {

    if (type === "text" && textBody) {

      const intentResult = await handleM1Intent({ message: textBody });

      logger.info(
        `M1 Result -> Intent: ${intentResult.intent} | Confidence: ${intentResult.confidence} | BelowThreshold: ${intentResult.belowThreshold}`
      );

      if (!intentResult.belowThreshold) {

        switch (intentResult.intent) {

          case "EMPRESARIAL_BENEFICIOS":
          case "EMPRESARIAL_PATRIMONIAL":

            logger.info("Routing to M2 Engine (from INICIO)");

            const m2ResultFromInicio = await Promise.resolve(
              handleM2Engine({
              currentState: STATES.M2_ENTRY,
              type,
              textBody,
              buttonId
            }));
            if (m2ResultFromInicio) return m2ResultFromInicio;
            break;

          case "NO_TARGET_INDIVIDUAL":

            logger.info("Redirecting to Individual Flow (tienda online)");

            return {
              messageToSend: {
                type: "text",
                text: {
                  body:
                    "Actualmente atendemos seguros empresariales.\n\n" +
                    "Si buscas un seguro individual puedes cotizar directamente aquí:\n" +
                    "https://tienda.ammia.io/inicio/multi-quote"
                }
              },
              nextState: STATES.SYS_MENU,
              mutateConversation: null
            };

          case "INFO_SUREXS":

            logger.info("Sending INFO_SUREXS response");

            return {
              messageToSend: {
                type: "text",
                text: { body: "Surexs es especialista en seguros empresariales." }
              },
              nextState: STATES.SYS_MENU,
              mutateConversation: null
            };
        }
      }
    }

    logger.info("No clear intent -> Sending Main Menu");

    return {
      messageToSend: buildMainMenu("¡Hola! 👋 Bienvenido a Surexs. ¿Cómo puedo ayudarte hoy?"),
      nextState: STATES.SYS_MENU,
      mutateConversation: null
    };
  }

  // B) Interactivos
  if (type === "interactive") {

    logger.info(`Interactive received -> Button: ${buttonId}`);

    const m2 = await Promise.resolve(handleM2Engine({ currentState, type, textBody, buttonId }));
    if (m2) {
      logger.info("Handled by M2 Engine (interactive)");
      return m2;
    }

    switch (buttonId) {

      case "RESCUE_MENU":
        logger.info("Rescue Menu triggered");
        return {
          messageToSend: buildMainMenu("¿Qué necesitas?"),
          nextState: STATES.SYS_MENU,
          mutateConversation
        };

      case "RESCUE_SOY_EMPRESA":
      case "RESCUE_EMPRESARIAL":

        logger.info("Rescue Empresarial -> Entering M2");

        return {
          messageToSend: {
            type: "text",
            text: {
              body: "Perfecto. Para ayudarte: ¿cuántos empleados tienen y qué coberturas buscan? (GMM, Vida, Dental, Visión)"
            },
          },
          nextState: STATES.M2_ENTRY,
          mutateConversation: null,
        };

      case "INFO_SUREXS":
        logger.info("Interactive INFO_SUREXS");
        return {
          messageToSend: {
            type: "text",
            text: { body: "Surexs ofrece seguros para empresas. Más info: surexs.com" }
          },
          nextState: STATES.SYS_MENU,
          mutateConversation: null,
        };

      default:
        logger.warn("Unknown interactive button");
        return {
          messageToSend: buildMainMenu("Opción no reconocida. Elige una opción del menú:"),
          nextState: STATES.SYS_MENU,
          mutateConversation: null,
        };
    }
  }

  // C) Texto
  if (type === "text") {

    const lower = (textBody || "").trim().toLowerCase();

    if (["menu", "menú", "inicio", "reset"].includes(lower)) {
      logger.info("Manual menu/reset triggered");
      return {
        messageToSend: buildMainMenu(),
        nextState: STATES.SYS_MENU,
        mutateConversation
      };
    }

    if (currentState === STATES.SYS_MENU) {

      const intentResult = await handleM1Intent({ message: textBody });

      logger.info(
        `SYS_MENU M1 -> Intent: ${intentResult.intent} | Confidence: ${intentResult.confidence} | BelowThreshold: ${intentResult.belowThreshold}`
      );

      if (intentResult.belowThreshold) {
        intentResult.intent = "UNKNOWN";
      }

      switch (intentResult.intent) {

        case "EMPRESARIAL_BENEFICIOS":
        case "EMPRESARIAL_PATRIMONIAL":

          logger.info("SYS_MENU -> Routing to M2");

          const m2ResultFromSysMenu = await Promise.resolve(
            handleM2Engine({
            currentState: STATES.M2_ENTRY,
            type,
            textBody,
            buttonId
          }));
          if (m2ResultFromSysMenu) return m2ResultFromSysMenu;
          break;

        case "NO_TARGET_INDIVIDUAL":

          logger.info("SYS_MENU -> Redirecting to Individual");

          return {
            messageToSend: {
              type: "text",
              text: {
                body:
                  "¡Claro! 🙌 \n" +
                  "Actualmente nos especializamos en seguros empresariales.\n\n" +
                  "Si buscas un seguro individual para tu familia, puedes cotizar directamente aquí: https://tienda.ammia.io/inicio/multi-quote\n\n" +
                  "Si en algún momento necesitas protección para tu empresa, con gusto te ayudamos."
              }
            },
            nextState: STATES.SYS_MENU,
            mutateConversation: null
          };

        case "INFO_SUREXS":

          logger.info("SYS_MENU -> Sending INFO_SUREXS");

          return {
            messageToSend: {
              type: "text",
              text: { body: "Surexs es una firma especializada en soluciones de seguros empresariales." }
            },
            nextState: STATES.SYS_MENU,
            mutateConversation: null
          };

        case "UNKNOWN":
        default:

          logger.warn("SYS_MENU -> UNKNOWN intent");

          return {
            messageToSend: buildRescueAmbiguous(
              "¿Buscas seguros para una empresa? Si es corporativo, te apoyo. Si no, puedes volver al menú."
            ),
            nextState: STATES.SYS_MENU,
            mutateConversation: null
          };
      }
    }

    const m2 = await Promise.resolve(handleM2Engine({ currentState, type, textBody, buttonId }));
    if (m2) {
      logger.info("Continuing M2 flow");
      return m2;
    }

    logger.info("Fallback -> Sending Main Menu");

    return {
      messageToSend: buildMainMenu("Elige una opción del menú:"),
      nextState: STATES.SYS_MENU,
      mutateConversation: null,
    };
  }

  // D) Otros tipos
  logger.warn("Unsupported message type received");

  return {
    messageToSend: { type: "text", text: { body: "Por ahora solo procesamos texto o botones." } },
    nextState: currentState,
    mutateConversation: null,
  };
};

module.exports = { routeMessage };
