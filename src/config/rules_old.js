// src/config/rules.js
// Rangos oficiales de empleados
const EMPLOYEE_RANGES = {
  LESS_THAN_20: "<20",
  RANGE_20_50: "20-50",
  RANGE_50_100: "50-100",
  RANGE_100_500: "100-500",
  RANGE_500_PLUS: "500+"
};

// Mapa de prioridad por rango
const LEAD_PRIORITY = {
  "<20": null,
  "20-50": 1,
  "50-100": 2,
  "100-500": 3,
  "500+": 4
};

module.exports = {
  EMPLOYEE_RANGES,
  LEAD_PRIORITY
};