// src/controllers/benefitsLeadsSmallController.js

const OutboxLead = require("../models/OutboxLead");

const requireAdmin = (req) => {
  const token = req.headers["x-admin-token"] || req.query.token;
  return token && process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
};

// ------------------------------------------------------------
// LISTAR LEADS DE EMPRESAS PEQUEÑAS (<20 EMPLEADOS)
// ------------------------------------------------------------
// Consulta la colección `outboxleads` y genera una tabla HTML
// simple para visualizar los leads capturados por el bot.
// No usamos motor de plantillas para mantener el proyecto
// lo más simple posible.

const listBenefitsLeadsSmall = async (req, res) => {

  try {

    const leads = await OutboxLead.find({
      "payload.benefits.employee_range": "<30"
    })
    .sort({ createdAt: -1 })
    .lean();


    // ------------------------------------------------------------
    // CONSTRUIR FILAS DE LA TABLA
    // ------------------------------------------------------------

    const rows = leads.map(lead => {

      const name = lead.payload?.contact?.name || "";
      const company = lead.payload?.contact?.company || "";
      const email = lead.payload?.contact?.email || "";
      const role = lead.payload?.contact?.role || "";
      const employees = lead.payload?.benefits?.employee_range || "";

      const date = new Date(lead.createdAt).toLocaleString();

      return `
        <tr>
          <td>${name}</td>
          <td>${company}</td>
          <td>${email}</td>
          <td>${role}</td>
          <td>${employees}</td>
          <td>${date}</td>
        </tr>
      `;

    }).join("");



    // ------------------------------------------------------------
    // HTML COMPLETO DE LA PÁGINA
    // ------------------------------------------------------------

    const html = `
      <html>

      <head>

        <title>Leads Beneficios - Empresas <20 empleaxzdos</title>

        <style>

          body {
            font-family: Arial;
            padding: 40px;
            background: #f5f5f5;
          }

          h1 {
            margin-bottom: 20px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
          }

          th, td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: left;
          }

          th {
            background: #333;
            color: white;
          }

          tr:nth-child(even) {
            background: #f9f9f9;
          }

        </style>

      </head>

      <body>

        <h1>Leads Beneficios — Empresas con menos de 30 empleados</h1>

        <table>

          <thead>
            <tr>
              <th>Nombre</th>
              <th>Empresa</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Empleados</th>
              <th>Fecha</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>

        </table>

      </body>

      </html>
    `;

    res.send(html);

  } catch (error) {

    console.error("Error cargando leads small company:", error);

    res.status(500).send("Error cargando leads");

  }

};

module.exports = {
  listBenefitsLeadsSmall
};