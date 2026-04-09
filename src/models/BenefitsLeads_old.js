// src/models/BenefitsLeads.js
const mongoose = require("mongoose");

const LeadBenefitsSchema = new mongoose.Schema(
{
  wa_id: { type: String, index: true },

  employee_range: String,
  coverages: [String],

  name: String,
  company: String,
  email: String,

  source_conversation_id: mongoose.Schema.Types.ObjectId
},
{ timestamps: true }
);

module.exports = mongoose.model("LeadBenefits", LeadBenefitsSchema);