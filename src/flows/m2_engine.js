// src/flows/m2_engine.js

/**
 * ============================================================
 * M2 ENGINE — MOTOR GENÉRICO DE FLUJOS DE PRODUCTO
 * ============================================================
 *
 * Este engine:
 * - NO contiene lógica de negocio
 * - NO contiene definición de productos
 * - Solo ejecuta el flujo definido en productsRegistry
 *
 * Arquitectura:
 *
 * Webhook
 *   → messageHandler
 *       → routeMessage
 *           → M1 (intent)
 *           → M2 (este engine)
 *       → M3 (Outbox)
 *
 * El producto define:
 * - steps
 * - evaluateQualification()
 * - build_payload_fragment()
 *
 * El engine solo ejecuta.
 */

const PRODUCTS = require("./productsRegistry");

const {
  ensureConversationData,
  parseContactBlock,
  isValidEmail
} = require("../utils/extractors");

/**
 * Estados internos del flujo M2
 * Se usan strings directos para simplificar arquitectura.
 */
const M2 = {
  INTAKE: "M2_INTAKE",
  CONTACT: "M2_CONTACT",
  DONE: "M2_DONE",
};

/**
 * Inicializa estructura M2 en la conversación si no existe.
 */
const initM2 = (conv) => {
  ensureConversationData(conv);

  if (!conv.conversation_data.m2) {
    conv.conversation_data.m2 = {
      product: null,
      active_step_index: 0,
      answers: {},
      contact: null,
      qualificationStatus: null,
      leadPriority: null,
    };

    conv.markModified("conversation_data");
  }
};

/**
 * ============================================================
 * FUNCIÓN PRINCIPAL
 * ============================================================
 */
const handleM2Engine = ({ currentState, type, textBody, buttonId, buttonTitle }) => {

  const isEntryButton = Object
    .values(PRODUCTS)
    .some(p => p.entry_button_id === buttonId);

  // M2 solo actúa si:
  // - Es botón de producto
  // - Ya estamos en estado M2
  if (!(isEntryButton || currentState?.startsWith("M2_"))) {
    return null;
  }

  /**
   * ============================================================
   * 1️⃣ ENTRADA POR BOTÓN DE PRODUCTO
   * ============================================================
   */
  if (type === "interactive" && isEntryButton) {

    const product = Object
      .values(PRODUCTS)
      .find(p => p.entry_button_id === buttonId);

    return {
      nextState: M2.INTAKE,

      mutateConversation: (conv) => {
        initM2(conv);

        const m2 = conv.conversation_data.m2;
        m2.product = product.key;
        m2.active_step_index = 0;
        m2.answers = {};
        m2.qualificationStatus = null;
        m2.leadPriority = null;

        conv.markModified("conversation_data");
      },

      afterMutateMessageToSend: (conv) => {
        const m2 = conv.conversation_data.m2;
        const p = PRODUCTS[m2.product];
        return p.steps[0].ask();
      }
    };
  }

  /**
   * ============================================================
   * 2️⃣ CAPTURA DE STEPS
   * ============================================================
   */
  if (currentState === M2.INTAKE && (type === "text" || type === "interactive")) {

    return {
      nextState: M2.INTAKE,

      mutateConversation: (conv) => {

        initM2(conv);

        const m2 = conv.conversation_data.m2;
        const p = PRODUCTS[m2.product];
        const step = p.steps[m2.active_step_index];

        const parsed = step.parse(textBody, { buttonId, buttonTitle });

        if (!step.is_valid(parsed)) {
          conv._m2_fail_message = step.fail_message();
          return;
        }

        step.store(m2.answers, parsed);

        // Evaluación de negocio delegada al producto
        if (p.evaluateQualification) {
          const result = p.evaluateQualification(m2.answers);

          m2.qualificationStatus = result.status;
          m2.leadPriority = result.priority;

          if (result.status === "redirect_individual") {
            m2._redirect_individual = true;
          }
        }

        m2.active_step_index += 1;

        if (m2.active_step_index >= p.steps.length) {
          m2._go_contact = true;
        }

        conv.markModified("conversation_data");
      },

      afterMutate: (conv) => {

        if (conv._m2_fail_message) {
          return {
            nextState: M2.INTAKE,
            messageToSend: conv._m2_fail_message
          };
        }

        const m2 = conv.conversation_data.m2;

        // Redirección si el producto lo decidió
        if (m2._redirect_individual) {
          return {
            nextState: "INICIO",
            messageToSend: {
              type: "text",
              text: {
                body:
                  "Gracias 🙌\n\n" +
                  "Para empresas con menos de 20 colaboradores contamos con soluciones individuales.\n\n" +
                  "https://tienda.ammia.io/inicio/multi-quote"
              }
            }
          };
        }

        if (m2._go_contact) {
          return {
            nextState: M2.CONTACT,
            messageToSend: {
              type: "text",
              text: {
                body:
                  "Perfecto. Ahora compárteme:\n" +
                  "- Nombre\n- Puesto\n- Empresa\n- Correo\n\n" +
                  "Ej: Juan, RH, ACME, juan@acme.com"
              }
            }
          };
        }

        const p = PRODUCTS[m2.product];
        return {
          nextState: M2.INTAKE,
          messageToSend: p.steps[m2.active_step_index].ask()
        };
      }
    };
  }

  /**
   * ============================================================
   * 3️⃣ CAPTURA DE CONTACTO
   * ============================================================
   */
  if (currentState === M2.CONTACT && type === "text") {

    const parsed = parseContactBlock(textBody || "");

    const required = ["name", "role", "company", "email"];

    const valid = required.every(field => {
      if (field === "email") {
        return parsed.email && isValidEmail(parsed.email);
      }
      return !!parsed[field];
    });

    if (!valid) {
      return {
        nextState: M2.CONTACT,
        messageToSend: {
          type: "text",
          text: {
            body:
              "Comparte los datos en este formato:\n" +
              "Nombre, Puesto, Empresa, correo@empresa.com"
          }
        }
      };
    }

    return {
      nextState: "INICIO",

      messageToSend: {
        type: "text",
        text: {
          body:
            "Gracias 🙌\n\n" +
            "Hemos recibido tu información.\n" +
            "Te contactaremos en un lapso de máximo 2 días."
        }
      },

      mutateConversation: (conv) => {
        initM2(conv);
        conv.conversation_data.m2.contact = parsed;
        conv.markModified("conversation_data");
      },

      outboxJob: {
        module: "M2_SINGLE",
        payload_builder: "M2_SINGLE",
        final_state: "INICIO"
      }
    };
  }

  return null;
};

/**
 * ============================================================
 * PAYLOAD BUILDERS
 * ============================================================
 */
const PAYLOAD_BUILDERS = {
  M2_SINGLE: ({ userConversation }) => {

    const m2 = userConversation.conversation_data?.m2 || {};
    const p = PRODUCTS[m2.product];

    const fragment = p?.build_payload_fragment
      ? p.build_payload_fragment(m2.answers || {})
      : {};

    const payload = {
      wa_id: userConversation.wa_id,
      captured_at: new Date().toISOString(),
      product: m2.product,
      lead_priority: m2.leadPriority,
      qualification_status: m2.qualificationStatus,
      ...fragment,
      contact: m2.contact,
      final_state: M2.DONE
    };

    // Reset interno
    userConversation.conversation_data.m2 = {
      product: null,
      active_step_index: 0,
      answers: {},
      contact: null,
      qualificationStatus: null,
      leadPriority: null,
    };

    userConversation.markModified("conversation_data");

    return payload;
  }
};

module.exports = { handleM2Engine, PAYLOAD_BUILDERS, M2 };