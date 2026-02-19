// src/services/outboxMailer.js
const { sendEmail } = require("./emailService");

const safe = (v) => (v == null ? "" : String(v));

const buildLeadEmail = (doc) => {
  const payload = doc.payload || {};
  const benefits = payload.benefits || {};
  const contact = payload.contact || {};

  const subject =
    `[Surexs Lead] ${safe(contact.company || "Empresa")} - ${safe(contact.name || "Contacto")}`.trim();

  const summaryLines = [
    `Outbox ID: ${safe(doc._id)}`,
    `Status: ${safe(doc.status)}`,
    `Module: ${safe(doc.module)}`,
    `wa_id: ${safe(doc.wa_id)}`,
    "",
    "== RESUMEN ==",
    `Empresa: ${safe(contact.company)}`,
    `Nombre: ${safe(contact.name)}`,
    `Puesto: ${safe(contact.role)}`,
    `Email: ${safe(contact.email)}`,
    `Empleados: ${safe(benefits.employee_count)}`,
    `Productos: ${(benefits.products || []).join(", ")}`,
    "",
    "== PAYLOAD JSON ==",
    JSON.stringify(payload, null, 2),
  ];

  const text = summaryLines.join("\n");

  const html = `
    <h3>Nuevo Lead (Outbox)</h3>
    <ul>
      <li><b>Outbox ID:</b> ${safe(doc._id)}</li>
      <li><b>Module:</b> ${safe(doc.module)}</li>
      <li><b>wa_id:</b> ${safe(doc.wa_id)}</li>
    </ul>
    <h4>Resumen</h4>
    <ul>
      <li><b>Empresa:</b> ${safe(contact.company)}</li>
      <li><b>Nombre:</b> ${safe(contact.name)}</li>
      <li><b>Puesto:</b> ${safe(contact.role)}</li>
      <li><b>Email:</b> ${safe(contact.email)}</li>
      <li><b>Empleados:</b> ${safe(benefits.employee_count)}</li>
      <li><b>Productos:</b> ${(benefits.products || []).join(", ")}</li>
    </ul>
    <h4>Payload JSON</h4>
    <pre style="background:#f6f6f6;padding:12px;border:1px solid #ddd;white-space:pre-wrap;">${safe(
      JSON.stringify(payload, null, 2)
    )}</pre>
  `;

  return { subject, text, html };
};

const sendOutboxLeadEmail = async (doc) => {
  const to = process.env.EMAIL_TO;
  if (!to) throw new Error("EMAIL_TO missing");

  const { subject, text, html } = buildLeadEmail(doc);
  return sendEmail({ to, subject, text, html });
};

module.exports = { sendOutboxLeadEmail };
