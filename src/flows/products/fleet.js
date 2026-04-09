// src/flows/products/fleet.js
/**
 * Parser inteligente de contactos
 */
const { parseLeadContact } = require("../../utils/leadContactParser");
/**
 * FLEET – Motor de flujo de seguros de flotilla
 *
 * - Misma estructura que BENEFITS
 * - Entrada por botón
 * - Steps con parse, store, is_valid
 * - Evaluación de negocio aislada
 */

const VEHICLE_RANGES = {
  "0-10": { priority: 0, qualified: true },
  "10-50": { priority: 1, qualified: true },
  "51-200": { priority: 2, qualified: true },
  "+201": { priority: 3, qualified: true },
};

module.exports = {
  key: "FLEET",
  label: "Flotilla Vehicular",
  entry_button_id: "FLEET",

  steps: [
    /**
     * STEP 1 – Selección rango de vehículos
     */
    {
      id: "fleet_vehicle_range",

      ask: () => ({
        type: "interactive",
        interactive: {
          type: "list",
          body: {
            text:
          "1/2\n\nApóyanos con algunos datos. Esto nos ayudará a cotizar mejor con las aseguradoras.\n\n¿Cuántos vehículos deseas asegurar?"
            },
          action: {
            button: "Seleccionar",
            sections: [
              {
                title: "Seleccionar rango",
                rows: [
                  { id: "VEH_10", title: "Menos de 10 vehículos" },
                  { id: "VEH_10_50", title: "10-50 vehículos" },
                  { id: "VEH_51_200", title: "51-200 vehículos" },
                  { id: "VEH_201PLUS", title: "+201 vehículos" },
                ],
              },
            ],
          },
        },
      }),

      /**
     * Convierte el ID del botón seleccionado
     * en el rango de vehículos correspondiente.
     */
    parse: (_, context) => {

      const map = {
        VEH_10: "0-10",
        VEH_10_50: "10-50",
        VEH_51_200: "51-200",
        VEH_201PLUS: "+201",
      };

      return {
        vehicle_range: map[context?.buttonId] || null,
      };


      },

      is_valid: (a) => !!a.vehicle_range,

      store: (answers, parsed) => {
        answers.vehicle_range = parsed.vehicle_range;
      },

      fail_message: () => ({
        type: "text",
        text: { body: "Por favor selecciona un rango usando el botón." },
      }),
    },
    /**
     * STEP 2 – Captura de contacto
     * Cada producto captura sus propios datos
     */
    {
      id: "fleet_contact",

      ask: () => ({
        type: "text",
        text: {
          body:
            "2/2\n\n" +
            "Para enviarte la cotización compárteme:\n\n" +
            "Nombre, Puesto, Empresa, correo@empresa.com\n\n" +
            "Ejemplo:\nJuan Pérez, Gerente de RH, ACME, juan@acme.com"
        },
      }),

      /**
       * Parser inteligente de contacto
       * Utiliza el util compartido para interpretar
       * múltiples formatos de texto enviados por el usuario
       */

      

      parse: (text) => {

        const parsed = parseLeadContact(text);

        return {
          contact: parsed
        };
      },

      is_valid: (a) =>
        a.contact?.name &&
        a.contact?.role &&
        a.contact?.company &&
        a.contact?.email,

      store: (answers, parsed) => {
        answers.contact = parsed.contact;
      },

      fail_message: () => ({
        type: "text",
        text: {
          body:
            "Comparte los datos en este formato:\n\n" +
            "Nombre, Puesto, Empresa, correo@empresa.com"
        }
      }),
    },
  ],

  evaluateQualification: (answers) => {
    const range = answers.vehicle_range;
    const rule = VEHICLE_RANGES[range];

    if (!rule) return { status: "unknown", priority: 0 };
    return {
      status: rule.qualified ? "qualified" : "redirect_individual",
      priority: rule.priority,
    };
  },

    /**
   * ============================================================
   * FRAGMENTO DE PAYLOAD DEL PRODUCTO
   * ============================================================
   *
   * IMPORTANTE:
   * Los productos NO deben construir el objeto contact.
   * El contacto es responsabilidad del M2_ENGINE.
   *
   * Aquí solo se devuelven los datos propios del producto.
   */

  build_payload_fragment: (answers) => ({

    fleet: {
      vehicle_range: answers.vehicle_range || null,
      coverages: answers.coverages || []
    }

  }),
};