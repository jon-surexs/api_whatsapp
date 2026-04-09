// src/controllers/benefitsLeadsController.js

const OutboxLead = require("../models/OutboxLead");

// ------------------------------------------------------------
// VALIDAR TOKEN ADMIN
// ------------------------------------------------------------
// Permite acceder al panel solo si el token enviado
// coincide con el ADMIN_TOKEN definido en el .env
// ------------------------------------------------------------

const requireAdmin = (req) => {
  const token = req.headers["x-admin-token"] || req.query.token;
  return token && process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
};



// ------------------------------------------------------------
// LISTAR LEADS DE EMPRESAS GRANDES (>50 EMPLEADOS)
// ------------------------------------------------------------
// Este controller es prácticamente idéntico al de
// benefitsLeadsSmallController.js pero filtra empresas
// con más de 50 empleados.
//
// No usamos motor de plantillas para mantener el
// proyecto lo más simple posible.
// ------------------------------------------------------------

const listBenefitsLeads = async (req, res) => {

  // ------------------------------------------------------------
  // VALIDAR ACCESO ADMIN
  // ------------------------------------------------------------

  if (!requireAdmin(req)) {
    return res.status(401).send("Unauthorized");
  }

  try {

    // ------------------------------------------------------------
    // CONSULTAR LEADS EN MONGODB
    // ------------------------------------------------------------
    // Filtramos por employee_range >50
    // ------------------------------------------------------------

    const leads = await OutboxLead.find({
      "payload.benefits.employee_range": { $in: ["50-100", "100-500", "500+"] }
    })
    .sort({ createdAt: -1 })
    .lean();



    // ------------------------------------------------------------
    // CONSTRUIR FILAS DE LA TABLA HTML
    // ------------------------------------------------------------

    const rows = leads.map(lead => {

      const name = lead.payload?.contact?.name || "";
      const company = lead.payload?.contact?.company || "";
      const email = lead.payload?.contact?.email || "";
      const role = lead.payload?.contact?.role || "";
      const employees = lead.payload?.benefits?.employee_range || "";

      const date = new Date(lead.createdAt).toLocaleString();

      // ------------------------------------------------------------
      // DETERMINAR PRIORIDAD DEL LEAD SEGÚN TAMAÑO DE EMPRESA
      // ------------------------------------------------------------
      // 100-500 empleados  → fila amarilla
      // 500+ empleados     → fila roja
      // ------------------------------------------------------------

      let rowClass = "";

      if (employees === "100-500") {
        rowClass = "lead-medium";
      }

      if (employees === "500+") {
        rowClass = "lead-large";
      }

      return `
        <tr class="${rowClass}">
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

        <title>Leads Beneficios - Empresas >50 empleados</title>

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
          .lead-medium {
            background: #fff3cd;
          }

          .lead-large {
            background: #f8d7da;
            font-weight: bold;
          }

        </style>

      </head>

      <body>

        <h1>Leads Beneficios — Empresas con más de 50 empleados</h1>

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

    console.error("Error cargando leads large company:", error);

    res.status(500).send("Error cargando leads");

  }

};



module.exports = {
  listBenefitsLeads
};