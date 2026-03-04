// src/flows/products/fleet.js

/**
 * FLEET – Motor de flujo de seguros de flotilla
 *
 * - Misma estructura que BENEFITS
 * - Entrada por botón
 * - Steps con parse, store, is_valid
 * - Evaluación de negocio aislada
 */

const VEHICLE_RANGES = {
  "1-5": { priority: 0, qualified: true },
  "6-20": { priority: 1, qualified: true },
  "21-50": { priority: 2, qualified: true },
  "50+": { priority: 3, qualified: true },
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
          body: { text: "¿Cuántos vehículos tiene tu flotilla?" },
          action: {
            button: "Seleccionar",
            sections: [
              {
                title: "Rango de vehículos",
                rows: [
                  { id: "VEH_1_5", title: "1-5 vehículos" },
                  { id: "VEH_6_20", title: "6-20 vehículos" },
                  { id: "VEH_21_50", title: "21-50 vehículos" },
                  { id: "VEH_50_PLUS", title: "50+ vehículos" },
                ],
              },
            ],
          },
        },
      }),

      parse: (_, context) => {
        const map = {
          VEH_1_5: "1-5",
          VEH_6_20: "6-20",
          VEH_21_50: "21-50",
          VEH_50_PLUS: "50+",
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
     * STEP 2 – Coberturas opcionales
     */
    {
      id: "fleet_coverages",

      ask: () => ({
        type: "text",
        text: {
          body:
            "Selecciona las coberturas que te interesan:\n\n" +
            "1️⃣ Daños a terceros\n" +
            "2️⃣ Robo total\n" +
            "3️⃣ Incendio\n" +
            "4️⃣ GMM para conductores\n\n" +
            "Responde con los números separados por coma.\nEjemplo: 1,3",
        },
      }),

      parse: (text) => {
        const valid = ["1", "2", "3", "4"];
        const selected = String(text || "")
          .split(",")
          .map((n) => n.trim())
          .filter((n) => valid.includes(n));

        const map = {
          "1": "Daños a terceros",
          "2": "Robo total",
          "3": "Incendio",
          "4": "GMM para conductores",
        };

        return {
          coverages: selected.map((n) => map[n]),
        };
      },

      is_valid: (a) => Array.isArray(a.coverages) && a.coverages.length > 0,

      store: (answers, parsed) => {
        answers.coverages = parsed.coverages;
      },

      fail_message: () => ({
        type: "text",
        text: { body: "Selecciona al menos una opción válida. Ejemplo: 1,3" },
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

  build_payload_fragment: (answers) => ({
    fleet: {
      vehicle_range: answers.vehicle_range || null,
      coverages: answers.coverages || [],
    },
  }),
};