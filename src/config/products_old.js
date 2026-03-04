// src/config/products.js

const {
  extractEmployeeCount,
  extractBenefitsProducts,
  looksPersonal,
} = require("../utils/extractors");

const rules = require("./rules");

/**
 * PRODUCTS CONFIG - Versión MVP simplificada
 * Un solo producto por conversación
 * Flujo secuencial vía steps[]
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

module.exports = { PRODUCTS };