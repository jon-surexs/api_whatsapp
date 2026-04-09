// src/flows/productsRegistry.js

const benefits = require("./products/benefits");
const fleet = require("./products/fleet");
const otherInsurance = require("./products/other_insurance");
const contactAdvisor = require("./products/contact_advisor");

module.exports = {
  BENEFITS: benefits,
  FLEET: fleet,
  OTHER_INSURANCE: otherInsurance,
  CONTACT_ADVISOR: contactAdvisor,
};