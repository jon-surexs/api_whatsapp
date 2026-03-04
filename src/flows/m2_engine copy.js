// src/flows/m2_engine.js

/**
 * ============================================================
 * M2 ENGINE — MOTOR DE FLUJO GUIADO DE PRODUCTO
 * ============================================================
 *
 * ¿Qué es M2?
 * ------------------------------------------------------------
 * M2 es el motor que ejecuta un flujo cerrado y estructurado
 * para capturar información de un producto específico.
 *
 * Arquitectura global del bot:
 *
 * Webhook
 *   → messageHandler (cerebro)
 *       → routeMessage (router principal)
 *           → M1 (intención básica)
 *           → M2 (este archivo)
 *       → M3 (Outbox / Handoff)
 *
 * Este archivo NO envía mensajes directamente.
 * Devuelve un objeto contrato que el handler ejecuta:
 *
 * {
 *   nextState,
 *   messageToSend,
 *   mutateConversation,
 *   afterMutate,
 *   afterMutateMessageToSend,
 *   outboxJob
 * }
 *
 * ------------------------------------------------------------
 * RESPONSABILIDADES DE M2
 * ------------------------------------------------------------
 *
 * 1) Activarse únicamente por botón de producto.
 * 2) Ejecutar steps secuenciales definidos en config/products.js.
 * 3) Validar cada respuesta.
 * 4) Guardar respuestas en conversation_data.m2.answers.
 * 5) Solicitar bloque de contacto.
 * 6) Cerrar el flujo correctamente.
 * 7) Disparar contrato fuerte hacia M3 (Outbox/Handoff).
 *
 * ------------------------------------------------------------
 * DISEÑO ACTUAL (MVP UNIPRODUCTO)
 * ------------------------------------------------------------
 *
 * - Solo un producto activo por conversación.
 * - Sin NLP libre.
 * - Sin detección automática por texto.
 * - Solo entra por botón interactivo.
 *
 * ============================================================
 */

const { STATES } = require("../constants/states");
/**
 * STATES:
 * Archivo: constants/states.js
 * Define todos los estados globales del bot.
 * Aquí usamos:
 * - M2_INTAKE
 * - M2_CONTACT
 * - M2_DONE
 * - INICIO
 */
/**
 * Reglas de negocio específicas para el producto Benefits.
 */

const MIN_EMPLOYEES = 20;

const EMPLOYEE_RANGES = [
  { label: "20-50", priority: 1 },
  { label: "50-100", priority: 2 },
  { label: "100-500", priority: 3 },
  { label: "500+", priority: 4 }
];

/**
 * Determina si el número de empleados califica como lead.
 */
function qualifies(employeeCount) {
  return employeeCount >= MIN_EMPLOYEES;
}

/**
 * Obtiene la prioridad según el rango seleccionado.
 */
function getPriority(rangeLabel) {
  const range = EMPLOYEE_RANGES.find(r => r.label === rangeLabel);
  return range ? range.priority : 0;
}

// const rules = require("../config/rules");
/**
 * rules:
 * Archivo: config/rules.js
 * Configuración de reglas de negocio.
 * Aquí se usa para:
 * - required_contact_fields
 */


const PRODUCTS = {
  BENEFITS: {
    key: "BENEFITS",
    label: "Beneficios (GMM)",
    entry_button_id: "BENEFICIOS",

    steps: [

      /**
 * STEP 1
 * Selección guiada del rango de empleados (Interactive List)
 */
{
  id: "benefits_employee_range",

  // Mensaje interactivo tipo LIST para mejor UX en WhatsApp
  ask: () => ({
    type: "interactive",
    interactive: {
      type: "list",
      body: {
        text: "¿Cuántos colaboradores tiene tu empresa?"
      },
      action: {
        button: "Seleccionar",
        sections: [
          {
            title: "Seleccionar rango",
            rows: [
               { id: "LESS_THAN_20", title: "Menos de 20" },
              { id: "EMP_20_50", title: "20-50 empleados" },
              { id: "EMP_50_100", title: "50-100 empleados" },
              { id: "EMP_100_500", title: "100-500 empleados" },
              { id: "EMP_500_PLUS", title: "500+ empleados" }
            ]
          }
        ]
      }
    }
  }),

      /**
       * Parse ahora debe leer buttonId (interactive)
       * ya NO texto numérico
       */
      parse: (_, context) => {
        const buttonId = context?.buttonId;

        const map = {
          LESS_THAN_20: "<20",
          EMP_20_50: "20-50",
          EMP_50_100: "50-100",
          EMP_100_500: "100-500",
          EMP_500_PLUS: "500+"
        };

        return {
          employee_range: map[buttonId] || null
        };
      },

      is_valid: (a) => !!a.employee_range,

      store: (answers, parsed) => {
        answers.employee_range = parsed.employee_range;
      },

      fail_message: () => ({
        type: "text",
        text: {
          body: "Por favor selecciona un rango usando el botón."
        }
      }),
    },

      /**
       * STEP 2
       * Selección múltiple de coberturas por número
       */
      {
        id: "benefits_coverages",

        ask: () => ({
          type: "text",
          text: {
            body:
              "Selecciona las coberturas que te interesan:\n\n" +
              "1️⃣ GMM\n" +
              "2️⃣ Dental\n" +
              "3️⃣ Vida\n" +
              "4️⃣ Visión\n\n" +
              "Responde con los números separados por coma.\nEjemplo: 1,2",
          },
        }),

        parse: (text) => {
          const valid = ["1", "2", "3", "4"];

          const selected = String(text || "")
            .split(",")
            .map((n) => n.trim())
            .filter((n) => valid.includes(n));

          const map = {
            "1": "GMM",
            "2": "Dental",
            "3": "Vida",
            "4": "Visión",
          };

          return {
            coverages: selected.map((n) => map[n]),
          };
        },

        is_valid: (a) =>
          Array.isArray(a.coverages) && a.coverages.length > 0,

        store: (answers, parsed) => {
          answers.coverages = parsed.coverages;
        },

        fail_message: () => ({
          type: "text",
          text: {
            body: "Selecciona al menos una opción válida. Ejemplo: 1,2",
          },
        }),
      },

    ],

    /**
       * Construcción del payload final para BENEFITS
       * Adaptado al nuevo flujo guiado
       */
      build_payload_fragment: (answers) => ({
        benefits: {
          employee_range: answers.employee_range || null,
          coverages: answers.coverages || [],
        },
      }),
 },

  FLEET: {
    key: "FLEET",
    label: "Flotilla",
    entry_button_id: "FLOTILLA",

    steps: [
      {
        id: "fleet_q1",

        ask: () => ({
          type: "text",
          text: { body: "Perfecto. Flotilla.\n¿Cuántos vehículos tienen?" },
        }),

        parse: (text) => {
          const m = String(text || "").match(/(\d{1,4})/);
          return { vehicle_count: m ? Number(m[1]) : null };
        },

        is_valid: (a) =>
          Number.isFinite(a.vehicle_count) && a.vehicle_count > 0,

        store: (answers, parsed) => {
          answers.vehicle_count = parsed.vehicle_count;
        },

        fail_message: () => ({
          type: "text",
          text: { body: 'Dime un número válido de vehículos. Ej: "40".' },
        }),
      },
    ],

    build_payload_fragment: (answers) => ({
      fleet: {
        vehicle_count: answers.vehicle_count || null,
      },
    }),
  },
};
// const { PRODUCTS } = require("../config/products");
/**
 * PRODUCTS:
 * Archivo: config/products.js
 *
 * Define cada producto:
 * {
 *   key,
 *   entry_button_id,
 *   steps: [
 *     {
 *       ask(),
 *       parse(),
 *       is_valid(),
 *       fail_message(),
 *       store()
 *     }
 *   ],
 *   build_payload_fragment()
 * }
 *
 * M2 depende totalmente de esta definición.
 */

const {
  ensureConversationData,
  parseContactBlock,
  isValidEmail
} = require("../utils/extractors");
/**
 * extractors:
 * Archivo: utils/extractors.js
 *
 * - ensureConversationData(conv)
 *      Garantiza que conversation_data exista.
 *
 * - parseContactBlock(text)
 *      Parsea bloque tipo:
 *      "Juan, RH, ACME, juan@acme.com"
 *
 * - isValidEmail(email)
 *      Validación básica de email.
 */



// ============================================================
// ESTADOS ACTIVOS DEL FLUJO M2
// ============================================================

const M2 = {
  INTAKE: STATES.M2_INTAKE,   // Captura de respuestas del producto
  CONTACT: STATES.M2_CONTACT,// Captura de datos de contacto
  DONE: STATES.M2_DONE,      // Estado final interno
};


// ============================================================
// INICIALIZACIÓN DE ESTRUCTURA M2 EN CONVERSACIÓN
// ============================================================

/**
 * initM2(conv)
 *
 * Se asegura de que exista conversation_data.m2.
 *
 * Estructura interna:
 * {
 *   product: string|null,
 *   active_step_index: number,
 *   answers: {},
 *   contact: null
 * }
 *
 * Solo se crea si no existe.
 */
const initM2 = (conv) => {
  ensureConversationData(conv);

  if (!conv.conversation_data.m2) {
    conv.conversation_data.m2 = {
      product: null,
      active_step_index: 0,
      answers: {},
      contact: null,
    };

    // Necesario para que Mongoose detecte cambios en Mixed
    conv.markModified("conversation_data");
  }
};



// ============================================================
// FUNCIÓN PRINCIPAL DEL ENGINE M2
// ============================================================

/**
 * handleM2Engine(...)
 *
 * Esta función es llamada por routeMessage.
 *
 * Recibe:
 * - currentState
 * - type (text / interactive)
 * - textBody
 * - buttonId
 * - buttonTitle
 *
 * Devuelve:
 * - null (si M2 no debe actuar)
 * - contrato de ejecución (si M2 toma control)
 */
const handleM2Engine = ({ currentState, type, textBody, buttonId, buttonTitle }) => {

  // Detecta si el botón presionado es de entrada de producto
  const isEntryButton = Object
    .values(PRODUCTS)
    .some((p) => p.entry_button_id === buttonId);

  // M2 solo se activa si:
  // - Se presiona botón de producto
  // - Ya estamos dentro de un estado M2
  if (!(isEntryButton || currentState?.startsWith("M2_"))) {
    return null;
  }


  // ============================================================
  // 1) ENTRADA AL FLUJO (POR BOTÓN)
  // ============================================================

  if (type === "interactive" && isEntryButton) {

    const productKey = Object
      .values(PRODUCTS)
      .find((p) => p.entry_button_id === buttonId).key;

    return {
      nextState: M2.INTAKE,

      messageToSend: null,

      mutateConversation: (conv) => {

        initM2(conv);

        const m2 = conv.conversation_data.m2;

        m2.product = productKey;
        m2.active_step_index = 0;
        m2.answers = {};

        conv.markModified("conversation_data");
      },

      afterMutateMessageToSend: (conv) => {
        const m2 = conv.conversation_data.m2;
        const p = PRODUCTS[m2.product];

        // Envía primera pregunta del producto
        return p.steps[0].ask();
      },
    };
  }


  // ============================================================
  // 2) CAPTURA DE STEPS SECUENCIALES
  // ============================================================

  if (currentState === M2.INTAKE && (type === "text" || type === "interactive")) {

    const text = (textBody || "").trim();

    return {
      nextState: M2.INTAKE,

      messageToSend: null,

      mutateConversation: (conv) => {

        initM2(conv);

        const m2 = conv.conversation_data.m2;
        const p = PRODUCTS[m2.product];
        const step = p.steps[m2.active_step_index];

        // Parse flexible (soporta botones)
        const parsed = step.parse(textBody, {
          buttonId,
          buttonTitle,
        });

        // Validación de respuesta
        if (!step.is_valid(parsed)) {
          conv._m2_fail_message = step.fail_message();
          return;
        }

        // Guardar respuesta
        step.store(m2.answers, parsed);
        // ============================================================
        // REGLA DE CALIFICACIÓN POR NÚMERO DE EMPLEADOS
        // ============================================================

        // Si el step actual guardó employee_range evaluamos calificación
        if (m2.answers.employee_range) {

          const employeeRange = m2.answers.employee_range;

          // Caso 1: Empresa con menos de 20 colaboradores → redirigir
          if (employeeRange === "<20") {

            m2._redirect_individual = true; // bandera interna
            m2.qualificationStatus = "redirect_individual";

            conv.markModified("conversation_data");
            return;
          }

          // Caso 2: Empresa calificada (20+)
          if (rules.LEAD_PRIORITY && rules.LEAD_PRIORITY[employeeRange]) {

            m2.leadPriority = rules.LEAD_PRIORITY[employeeRange];
            m2.qualificationStatus = "qualified";
          }
        }
        m2.active_step_index += 1;

        // Si terminamos todos los steps → vamos a CONTACT
        if (m2.active_step_index >= p.steps.length) {
          m2._go_contact = true;
        }

        conv.markModified("conversation_data");
      },

      afterMutate: (conv) => {

        if (conv._m2_fail_message) {
          return {
            nextState: M2.INTAKE,
            messageToSend: conv._m2_fail_message,
          };
        }

        const m2 = conv.conversation_data.m2;
        // ============================================================
        // REDIRECCIÓN A SEGUROS INDIVIDUALES SI <20
        // ============================================================

        if (m2._redirect_individual) {

          return {
            nextState: STATES.INICIO,
            messageToSend: {
              type: "text",
              text: {
                body:
                  "Gracias 🙌\n\n" +
                  "Para empresas con menos de 20 colaboradores contamos con soluciones individuales.\n\n" +
                  "Puedes revisarlas aquí:\n" +
                  "https://tienda.ammia.io/inicio/multi-quote\n\n" +
                  "Si más adelante tu empresa crece, con gusto podemos apoyarte con beneficios empresariales.",
              },
            },
          };
        }

         // ============================================================
        // REDIRECCIÓN A DATOS DE CONTACTO SI < 20
        // ============================================================
        if (m2._go_contact) {
          return {
            nextState: M2.CONTACT,
            messageToSend: {
              type: "text",
              text: {
                body:
                  "Perfecto. Ahora comparteme:\n- Nombre\n- Puesto\n- Empresa\n- Correo\n\nEj: Juan, RH, ACME, juan@acme.com",
              },
            },
          };
        }

        const p = PRODUCTS[m2.product];
        const step = p.steps[m2.active_step_index];

        return {
          nextState: M2.INTAKE,
          messageToSend: step.ask(),
        };
      },
    };
  }



  // ============================================================
  // 3) CAPTURA DE CONTACTO
  // ============================================================

  if (currentState === M2.CONTACT && type === "text") {

    const parsed = parseContactBlock(textBody || "");

    const req =
      rules.qualification.required_contact_fields ||
      ["name", "role", "company", "email"];

    const ok = req.every((k) => {
      if (k === "email") return parsed.email && isValidEmail(parsed.email);
      return !!parsed[k];
    });

    if (!ok) {
      return {
        nextState: M2.CONTACT,
        messageToSend: {
          type: "text",
          text: {
            body:
              "Perfecto. Ahora comparteme:\n- Nombre\n- Puesto\n- Empresa\n- Correo\n\nEj: Juan, RH, ACME, juan@acme.com",
          },
        },
        mutateConversation: null,
      };
    }

    // ============================================================
    // 4) CIERRE DE FLUJO + DISPARO DE M3
    // ============================================================

    return {
      nextState: STATES.INICIO,

      messageToSend: {
        type: "text",
        text: {
          body:
            "Gracias 🙌\n\n" +
            "Hemos recibido tu información.\n" +
            "Un consultor especializado te contactará en breve.\n\n" +
            "Si necesitas algo más, puedes escribir *menú* en cualquier momento.",
        },
      },

      mutateConversation: (conv) => {
        initM2(conv);
        conv.conversation_data.m2.contact = parsed;
        conv.markModified("conversation_data");
      },

      // Contrato fuerte hacia M3 (Outbox)
      outboxJob: {
        module: "M2_SINGLE",
        payload_builder: "M2_SINGLE",
        final_state: STATES.INICIO,
      },
    };
  }

  return null;
};



// ============================================================
// PAYLOAD BUILDERS (UTILIZADO POR M3)
// ============================================================

/**
 * PAYLOAD_BUILDERS
 *
 * Este objeto es consumido por:
 * messageHandler.js (M3 Outbox)
 *
 * Cuando outboxJob.payload_builder === "M2_SINGLE"
 * se ejecuta este builder.
 *
 * Responsabilidad:
 * - Construir payload final del lead
 * - Resetear estructura interna de M2
 */

const PAYLOAD_BUILDERS = {
  M2_SINGLE: ({ userConversation }) => {

    const m2 = userConversation.conversation_data?.m2 || {};
    const p = PRODUCTS[m2.product];

    const fragment = p.build_payload_fragment
      ? p.build_payload_fragment(m2.answers || {})
      : {};

   // Construcción final del payload para M3
    const payload = {
      wa_id: userConversation.wa_id,
      captured_at: new Date().toISOString(),
      product: m2.product,

      employee_range: m2.answers?.employee_range || null,
      lead_priority: m2.leadPriority || null,
      qualification_status: m2.qualificationStatus || "unknown",

      ...fragment,
      contact: m2.contact,
      final_state: STATES.M2_DONE,
    };

    // Reset interno
    userConversation.conversation_data.m2 = {
      product: null,
      active_step_index: 0,
      answers: {},
      contact: null,
    };

    userConversation.markModified("conversation_data");

    return payload;
  },
};

module.exports = { handleM2Engine, PAYLOAD_BUILDERS, M2 };