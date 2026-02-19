// src/config/rules.js
module.exports = {
  qualification: {
    // Umbrales (placeholders: cámbialos cuando definas reglas finales)
    min_employees: 20,

    // Intenciones a descalificar (texto libre) — V1 simple
    disqualify_patterns: [
      // Individual / patrimonial / 1 auto
      /\b(seguro|asegurar)\b.*\b(auto|carro|coche|autos|carros|coches)\b/i,
      /\bpara\s*mi\b/i,
      /\bsoy\s*particular\b/i,
      /\bmi\s*familia\b/i,
      /\b(1|un|una)\s*(auto|carro|coche)\b/i,
    ],

    // Campos mínimos (para cuando ya sea calificado)
    required_contact_fields: ["name", "role", "company", "email"],
  },
};
