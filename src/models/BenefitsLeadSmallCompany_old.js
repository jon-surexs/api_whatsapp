// src/models/BenefitsLeadSmallCompany.js
const mongoose = require("mongoose");

const LeadSmallCompanySchema = new mongoose.Schema(
{
  wa_id: { type: String, index: true },

  employee_range: String,
  coverages: [String],

  source_conversation_id: mongoose.Schema.Types.ObjectId
},
{ timestamps: true }
);

module.exports = mongoose.model("LeadSmallCompany", LeadSmallCompanySchema);