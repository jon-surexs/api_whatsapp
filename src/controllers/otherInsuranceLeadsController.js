// src/controllers/otherInsuranceLeadsController.js

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
// LISTAR LEADS DE OTHER INSURANCE
// ------------------------------------------------------------
// Este controller muestra todos los leads capturados
// desde el flujo OTHER_INSURANCE.
//
// Los datos del producto se almacenan en:
//
// payload.other_insurance.description
//
// y la información de contacto en:
//
// payload.contact
// ------------------------------------------------------------

const listOtherInsuranceLeads = async (req, res) => {

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
    // Filtramos solo leads del producto OTHER_INSURANCE
    // ------------------------------------------------------------

    const leads = await OutboxLead.find({
      "payload.product": "OTHER_INSURANCE"
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
      const phone = lead.payload?.contact?.phone || "";

      // ------------------------------------------------------------
      // EXTRAER DESCRIPCIÓN DEL SEGURO
      // ------------------------------------------------------------
      // Este campo proviene del flujo OTHER_INSURANCE
      // y contiene el texto que el usuario escribió
      // describiendo el seguro que necesita.
      // ------------------------------------------------------------

      const description = lead.payload?.other_insurance?.description || "";

      // prioridad calculada por el motor M2
      const priority = lead.payload?.lead_priority ?? "";

      let rowClass = "";

      if (priority === 1) {
        rowClass = "lead-small";
      }// verde
      if (priority === 2) {
        rowClass = "lead-small";
      }// amarillo
      if (priority === 3) {
        rowClass = "lead-small";
      }// rojo
      const date = new Date(lead.createdAt).toLocaleString();

      return `
        <tr class="${rowClass}">
          <td>${name}</td>
          <td>${company}</td>
          <td>${email}</td>
          <td>${role}</td>
          <td>${phone}</td>
          <td>${description}</td>
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

        <title>Leads Other Insurance</title>

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
        }.lead-small {
            background: auto;
          }
          .lead-medium {
            background: #fff3cd;
          }

          .lead-large {
            background: #f8d7da!important;
            font-weight: bold;
          }

        </style>

      </head>

      <body>

        <h1>Leads Other Insurance</h1>

        <table>

          <thead>
            <tr>
              <th>Nombre</th>
              <th>Empresa</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Teléfono</th>
              <th>Descripción del seguro</th>
              
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

    console.error("Error cargando leads fleet:", error);

    res.status(500).send("Error cargando leads");

  }

};



module.exports = {
  listOtherInsuranceLeads
};