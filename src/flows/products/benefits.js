// src/flows/products/benefits.js
/**
 * Parser inteligente de contactos
 */
const { parseLeadContact } = require("../../utils/leadContactParser");
const MIN_EMPLOYEES = 20;

const EMPLOYEE_RANGES = {
  "<30": { priority: 0, qualified: false },
  "30-100": { priority: 1, qualified: true },
  "101-250": { priority: 2, qualified: true },
  "250+": { priority: 3, qualified: true }
};

module.exports = {
  key: "BENEFITS",
  label: "Beneficios (GMM)",
  entry_button_id: "BENEFITS",

 steps: [
/**
       * STEP 1
       * Selección múltiple de coberturas por número
       */
      {
        id: "benefits_coverages",

        ask: () => ({
          type: "text",
          text: {
            body:
              "1/3\n\n" +
              "\n\n" +
              "Selecciona las coberturas que te interesan:\n\n" +
              "1️⃣ Gastos Médicos Mayores\n" +
              "2️⃣ Seguro Dental\n" +
              "3️⃣ Seguro de Vida Colectivo\n" +
              "4️⃣ Seguro de Visión\n\n" +
              "Responde con los números que quieras elegir.\nEjemplo: 1,2",
          
        },
        }),

        parse: (text) => {

        const map = {
          "1": "GMM",
          "2": "Dental",
          "3": "Vida",
          "4": "Visión",
        };

        const input = String(text || "");

        // extrae todos los números 1-4 del texto
        const numbers = input.match(/[1-4]/g) || [];

        // eliminar duplicados
        const unique = [...new Set(numbers)];

        return {
          coverages: unique.map(n => map[n])
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
            body:
            "No pude identificar las opciones.\n\n" +
            "Responde con los números.\n\n" +
            "Ejemplo:\n1,2"
          },
        }),
      },
      /**
     * STEP 2
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
            text:
            "2/3\n\n" +
            "Apóyanos con algunos datos. Esto nos ayudará a cotizar mejor con las aseguradoras\n\n" +
            "\n\n" +
            "¿Cuántos colaboradores deseas asegurar?"},
          action: {
            button: "Seleccionar",
            sections: [
              {
                title: "Seleccionar rango",
                rows: [
                  { id: "LESS_THAN_30", title: "Menos de 30" },
                  { id: "EMP_30_100", title: "30-100 empleados" },
                  { id: "EMP_101_250", title: "101-250 empleados" },
                  { id: "EMP_250PLUS", title: "Más de 250 empleados" }
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
              LESS_THAN_30: "<30",
              EMP_30_100: "30-100",
              EMP_101_250: "101-250",
              EMP_250PLUS: "100-500"
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
     * STEP 3
     * Captura de datos de contacto del prospecto
     *
     * NOTA:
     * Ahora cada producto captura su propio contacto.
     * Esto permite que cada flujo tenga diferentes datos
     * si en el futuro se requieren campos adicionales.
     */
    {
      id: "benefits_contact",

      ask: () => ({
        type: "text",
        text: {
          body:
            "3/3\n\n" +
            "Para enviarte la cotización compárteme:\n\n" +
            "Nombre, Puesto, Empresa, correo@empresa.com\n\n" +
            "Ejemplo:\nJuan Pérez, Gerente de RH, ACME, juan@acme.com"
        }
      }),

      /**
     * Parser inteligente de contacto
     * permite formatos libres del usuario
     */

    parse: (text) => {

      const parsed = parseLeadContact(text);

      return {
        contact: parsed
      };

    },

      /**
       * Validación básica de los datos
       */
      is_valid: (a) =>
        a.contact?.name &&
        a.contact?.role &&
        a.contact?.company &&
        a.contact?.email,

      /**
       * Guardado dentro del objeto answers del motor M2
       */
      store: (answers, parsed) => {
        answers.contact = parsed.contact;
      },

      /**
       * Mensaje de error si el formato no es correcto
       */
      fail_message: () => ({
        type: "text",
        text: {
          body:
            "Por favor comparte los datos en este formato:\n\n" +
            "Nombre, Puesto, Empresa, correo@empresa.com"
        }
      }),
    }   
      

    ],

  evaluateQualification: (answers) => {
    const range = answers.employee_range;
    const rule = EMPLOYEE_RANGES[range];

    if (!rule) {
      return { status: "unknown", priority: 0 };
    }

    if (range === "<30") {
    return {
      status: "small_company",
      priority: 0
    };
  }

  return {
    status: "qualified",
    priority: rule.priority
  };
},

  /**
 * ============================================================
 * FRAGMENTO DE PAYLOAD DEL PRODUCTO
 * ============================================================
 *
 * IMPORTANTE:
 * El contacto se construye en el M2_ENGINE.
 * El producto solo devuelve su información específica.
 */

build_payload_fragment: (answers) => ({

  benefits: {
    employee_range: answers.employee_range || null,
    coverages: answers.coverages || []
  }

}),
};