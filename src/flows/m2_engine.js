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

/**
 * Utilidades base del motor
 */
const {
  ensureConversationData
} = require("../utils/extractors");

/**
 * Estados internos del flujo M2
 * Ahora solo existe INTAKE porque
 * cada producto define TODOS sus pasos
 * incluyendo captura de contacto.
 */
const M2 = {
  INTAKE: "M2_INTAKE",
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
       conv.conversation_data.m2 = {
        product: product.key,
        active_step_index: 0,
        answers: {},
        contact: null,
        qualificationStatus: null,
        leadPriority: null,
      };

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

        /**
       * Avanza al siguiente paso del producto
       */
      m2.active_step_index += 1;

      /**
       * Si se terminaron los steps del producto
       * marcamos finalización del flujo
       */
      if (m2.active_step_index >= p.steps.length) {

        /**
       * ============================================================
       * CAPTURA FINAL DE CONTACTO
       * ============================================================
       *
       * Algunos productos almacenan el contacto completo en:
       * answers.contact
       *
       * Por lo tanto normalizamos aquí para que el engine
       * siempre tenga un objeto estándar en m2.contact.
       */

     /**
     * ============================================================
     * NORMALIZACIÓN DE CONTACTO
     * ============================================================
     * Algunos productos guardan contacto en answers.contact.
     * Si no existe, generamos estructura vacía.
     */

    if (m2.answers.contact) {

      m2.contact = {
        name: m2.answers.contact.name || null,
        role: m2.answers.contact.role || null,
        company: m2.answers.contact.company || null,
        email: m2.answers.contact.email || null,
        phone: conv.wa_id || null
      };

    } else {

      m2.contact = {
        name: null,
        role: null,
        company: null,
        email: null,
        phone: conv.wa_id || null
      };

}

        m2._flow_complete = true;
      }

        conv.markModified("conversation_data");
      },

      afterMutate: (conv) => {

       /**
       * ============================================================
       * MANEJO DE ERROR DE STEP
       * ============================================================
       * Si el step falló, enviamos el mensaje de error
       * y limpiamos la bandera para evitar loops.
       */

      if (conv._m2_fail_message) {

        const fail = conv._m2_fail_message;

        // Limpia bandera para que no se repita en el siguiente mensaje
        delete conv._m2_fail_message;

        return {
          nextState: M2.INTAKE,
          messageToSend: fail
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

        

        /**
       * Si el producto terminó todos sus steps
       * se envía al outbox para guardar el lead.
       */
      if (m2._flow_complete) {

        return {
          nextState: "INICIO",

          messageToSend: {
            type: "text",
            text: {
              body:
                "Gracias 🙌\n\n" +
                "Hemos recibido tu información.\n" +
                "Te contactaremos en breve."
            }
          },

          /**
           * JOB que enviará el lead al OUTBOX
           */
          outboxJob: {
            module: "M2_SINGLE",
            payload_builder: "M2_SINGLE",
            final_state: "INICIO"
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