// src/controllers/fleetLeadsController.js

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
// LISTAR LEADS DE FLOTILLAS
// ------------------------------------------------------------
// Este controller muestra todos los leads capturados
// desde el flujo de flotillas (Fleet).
//
// Los datos se almacenan en:
//
// payload.fleet.vehicle_range
//
// y la información de contacto en:
//
// payload.contact
// ------------------------------------------------------------

const listFleetSmallLeads = async (req, res) => {

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
    // Filtramos solo leads del producto FLEET
    // ------------------------------------------------------------

    const leads = await OutboxLead.find({
      "payload.fleet.vehicle_range": { $in: ["0-10"] }
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

      const vehicles = lead.payload?.fleet?.vehicle_range || "";
     const priority = lead.payload?.lead_priority ?? "";

      let rowClass = "";

      if (priority === 1) {
        rowClass = "lead-small";
      }// verde
      if (priority === 2) {
        rowClass = "lead-medium";
      }// amarillo
      if (priority === 3) {
        rowClass = "lead-large";
      }// rojo
      const date = new Date(lead.createdAt).toLocaleString();

      return `
        <tr class="${rowClass}">
          <td>${name}</td>
          <td>${company}</td>
          <td>${email}</td>
          <td>${role}</td>
          <td>${phone}</td>
          <td>${vehicles}</td>
          <td> ${priority}</td>
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

        <title>Leads Flotillas</title>

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

        <h1>Leads Flotillas — Flotillas con menos de 10 vehículos</h1>

        <table>

          <thead>
            <tr>
              <th>Nombre</th>
              <th>Empresa</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Teléfono</th>
              <th>Vehículos</th>
              <th>Prioridad</th>
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
  listFleetSmallLeads
};