// src/config/products.js

const { extractEmployeeCount, extractBenefitsProducts, looksPersonal } = require("../utils/extractors");
const rules = require("./rules");

/**
 * PRODUCTS CONFIG (M2 Engine)
 * Cada producto define:
 * - entry_button_id: cómo entra desde UI (button_reply.id)
 * - entry_state: a qué estado se setea al entrar
 * - flow: pasos (questions) para capturar datos
 * - rules: reglas de calificación / descalificación
 * - handoff: qué payload preparar para M3
 *
 * Nota: Los "extractors" son nombres simbólicos; el M2 Engine
 * los mapeará a funciones reales (extractEmployeeCount, etc).
 */

const PRODUCTS = {
  BENEFITS: {
    key: "BENEFITS",
    label: "Beneficios (GMM)",
    module_tag: "M2_BENEFITS_V0",
    entry_button_id: "BENEFICIOS",
    detect: {
      keywords: [/beneficios?/i, /gmm/i, /gastos\s*m[eé]dicos/i, /vida/i, /dental/i, /visi[oó]n/i],
    },

    steps: [
      {
        id: "benefits_q1",
        ask: () => ({
          type: "text",
          text: {
            body:
              "Perfecto. Te apoyo con programas de beneficios (GMM, Vida, Dental, Visión).\n\n" +
              "Para avanzar dime:\n" +
              "1) ¿Cuántos empleados tienen?\n" +
              "2) ¿Qué coberturas te interesan?\n\n" +
              'Ejemplo: "Somos 35 y queremos GMM + Dental".',
          },
        }),
        parse: (text) => {
          const employee_count = extractEmployeeCount(text);
          const products = extractBenefitsProducts(text);
          const is_personal = looksPersonal(text);
          return { employee_count, products, is_personal };
        },
        is_valid: (a) => {
          if (!a || a.is_personal) return false;
          if (!Number.isFinite(a.employee_count)) return false;
          if (a.employee_count < rules.qualification.min_employees) return false;
          return Array.isArray(a.products) && a.products.length > 0;
        },
        store: (answers, parsed) => {
          answers.employee_count = parsed.employee_count;
          answers.products = parsed.products;
        },
        fail_message: () => ({
          type: "text",
          text: {
            body:
              `Lo sentimos nuestros programas de beneficios requieren de un mínimo de ${rules.qualification.min_employees} empleados.\n\n` 
          },
        }),
      },
    ],

    build_payload_fragment: (answers) => ({
      benefits: {
        employee_count: answers.employee_count || null,
        products: answers.products || [],
      },
    }),

    // Entrada desde botón
    entry: {
      entry_button_id: "BENEFICIOS",
      entry_state: "M2_BENEFITS_Q1",
      intro_text:
        "Perfecto. Te apoyo con programas de beneficios (GMM, Vida, Dental, Visión).\n\n" +
        "Para avanzar dime:\n" +
        "1) ¿Cuántos empleados tienen?\n" +
        "2) ¿Qué coberturas te interesan?\n\n" +
        'Ejemplo: "Somos 35 y queremos GMM + Dental".',
    },

    // Reglas
    rules: {
      disqualify_patterns: [
        /seguro\s*(de|para)\s*(auto|carro|coche)/i,
        /\bun\s*auto\b/i,
        /soy\s*particular/i,
        /para\s*mi\b/i,
      ],
      min_employees: 20,
      required_contact_fields: ["name", "role", "company", "email"],
    },

    // Flujo M2: preguntas secuenciales
    flow: {
      steps: [
        {
          id: "benefits_pack",
          state: "M2_BENEFITS_Q1",
          prompt_text:
            "Para avanzar necesito 2 datos:\n" +
            "1) ¿Cuántos empleados tienen?\n" +
            "2) ¿Qué coberturas te interesan (GMM, Vida, Dental, Visión)?\n\n" +
            'Ejemplo: "Somos 35 y queremos GMM + Dental".',

          // extracción desde texto libre
          extract: {
            employee_count: { extractor: "employeeCount", required: true },
            products: { extractor: "benefitsProducts", required: true },
            is_personal: { extractor: "looksPersonal", required: false },
          },

          // validación para "pasar"
          validate: [
            { if: "is_personal", then: { action: "DISQUALIFY", reason: "PERSONAL" } },
            { if: "employee_count < rules.min_employees", then: { action: "DISQUALIFY", reason: "LOW_EMPLOYEES" } },
            { if: "!employee_count || products.length === 0", then: { action: "RETRY" } },
          ],

          on_success: {
            next_state: "M2_BENEFITS_CONTACT",
            save_to: "conversation_data.benefits",
            map: {
              employee_count: "employee_count",
              products: "products",
            },
            response_builder: "benefitsAskContact", // UI builder (en utils/ui.js)
          },
        },

        {
          id: "contact",
          state: "M2_BENEFITS_CONTACT",
          prompt_text:
            "Ahora compárteme por favor:\n" +
            "• Nombre\n• Puesto\n• Empresa\n• Correo\n\n" +
            "Ejemplo:\n" +
            "Nombre: Ana López\nPuesto: RH\nEmpresa: ACME\nCorreo: ana@acme.com",

          extract: {
            contact: { extractor: "contactBlock", required: true },
          },

          validate: [
            { if: "!contact.name || !contact.role || !contact.company || !contact.email", then: { action: "RETRY" } },
            { if: "!isValidEmail(contact.email)", then: { action: "RETRY" } },
          ],

          on_success: {
            next_state: "M2_DONE",
            save_to: "conversation_data.contact",
            map: {
              name: "contact.name",
              role: "contact.role",
              company: "contact.company",
              email: "contact.email",
            },
            response_text:
              "Gracias por responder, estamos procesando tus datos. Nos pondremos en contacto en breve.",
          },
        },
      ],
    },

    // Handoff para M3 / Outbox
    handoff: {
    enabled: true,
    final_state: "M2_DONE",
    outbox_module: "M2_BENEFITS_V0",
    payload_builder: "benefitsPayload",
    },

    // Rescue UI (se usa en NO_TARGET y ambigüos)
    rescue: {
      enable: true,
      buttons: {
        soy_empresa: { id: "RESCUE_SOY_EMPRESA", title: "Soy empresa" },
        menu: { id: "RESCUE_MENU", title: "Ver menú" },
      },
    },
  },

  // Ejemplo de otro producto (lo dejamos listo para crecer)
  FLEET: {
    key: "FLEET",
    label: "Flotilla",
    entry_button_id: "FLOTILLA",
    detect: { keywords: [/flotilla/i, /autos?\s*(empresa|empresarial)/i, /veh[ií]culos?/i] },
    steps: [
      {
        id: "fleet_q1",
        ask: () => ({ type: "text", text: { body: "Perfecto. Flotilla.\n¿Cuántos vehículos tienen?" } }),
        parse: (text) => {
          const m = String(text || "").match(/(\d{1,4})/);
          return { vehicle_count: m ? Number(m[1]) : null };
        },
        is_valid: (a) => Number.isFinite(a.vehicle_count) && a.vehicle_count > 0,
        store: (answers, parsed) => { answers.vehicle_count = parsed.vehicle_count; },
        fail_message: () => ({ type: "text", text: { body: "Dime un número de vehículos. Ej: \"40\"." } }),
      },
    ],
    build_payload_fragment: (answers) => ({
      fleet: { vehicle_count: answers.vehicle_count },
    }),
  },

  // Ejemplo: segundo producto (placeholder)
  // FLOTILLA: { ... }
};

module.exports = { PRODUCTS };
