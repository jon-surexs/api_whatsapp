// src/controllers/outboxController.js
const OutboxLead = require("../models/OutboxLead");

const requireAdmin = (req) => {
  const token = req.headers["x-admin-token"] || req.query.token;
  return token && process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
};

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");


const toCsvCell = (v) => {
  const s = String(v ?? "");
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const buildCsv = (docs) => {
  const header = [
    "id",
    "createdAt",
    "status",
    "module",
    "wa_id",
    "employee_count",
    "products",
    "name",
    "company",
    "email",
  ].join(",");

  const lines = docs.map((x) => {
    const row = [
      String(x._id || ""),
      x.createdAt ? new Date(x.createdAt).toISOString() : "",
      x.status || "",
      x.module || "",
      x.wa_id || "",
      x.payload?.benefits?.employee_count ?? "",
      (x.payload?.benefits?.products || []).join(" | "),
      x.payload?.contact?.name ?? "",
      x.payload?.contact?.company ?? "",
      x.payload?.contact?.email ?? "",
    ].map(toCsvCell);

    return row.join(",");
  });

  // BOM para Excel
  return "\ufeff" + [header, ...lines].join("\n");
};



const listOutboxLeads = async (req, res) => {
  try {
    if (!requireAdmin(req)) return res.status(401).send("Unauthorized");

    const status = (req.query.status || "ALL").toUpperCase();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "25", 10), 1), 100);
    const skip = (page - 1) * limit;

    const q = status === "ALL" ? {} : { status };

    const format = (req.query.format || "").toLowerCase();
    const wantsJson = format === "json" || (req.headers.accept || "").includes("application/json");

    // ✅ CSV DE TODO EL FILTRO (sin paginación)
    if (format === "csv") {
    const exportLimit = Math.min(Math.max(parseInt(req.query.export_limit || "5000", 10), 1), 50000);

    const docs = await OutboxLead.find(q)
        .sort({ createdAt: -1 })
        .limit(exportLimit)
        .lean();

    const csv = buildCsv(docs);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="outbox_leads_${status}.csv"`);
    return res.status(200).send(csv);
    }

    // ✅ HTML/JSON paginados (solo si NO es CSV)
    const [items, total] = await Promise.all([
    OutboxLead.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    OutboxLead.countDocuments(q),
    ]);

    if (wantsJson) {
    return res.json({ status, page, limit, total, items });
    }



    const totalPages = Math.max(Math.ceil(total / limit), 1);
        const rows = items
  .map((x) => {
    const id = String(x._id);
    const wa = escapeHtml(x.wa_id);
    const created = escapeHtml(new Date(x.createdAt).toISOString());
    const module = escapeHtml(x.module);

    // ✅ BUG FIX: usar valor REAL para comparar
    const stRaw = String(x.status || "");
    const st = escapeHtml(stRaw);

    // Extrae datos de benefits según estructura real del payload M2_SINGLE
      const emp = escapeHtml(
        x.payload?.benefits?.employee_range ?? ""
      );

      const prod = escapeHtml(
        (x.payload?.benefits?.coverages || []).join(", ")
      );
    const name = escapeHtml(x.payload?.contact?.name ?? "");
    const company = escapeHtml(x.payload?.contact?.company ?? "");
    const email = escapeHtml(x.payload?.contact?.email ?? "");

    // ✅ si ya está DONE, NO mostramos botón
    const actionHtml =
      stRaw === "DONE"
        ? `<span class="muted">✓ DONE</span>`
        : `
          <form method="POST" action="/outbox/leads/${id}/status?token=${encodeURIComponent(
            req.query.token || ""
          )}" style="display:flex; gap:6px;">
            <input type="hidden" name="status" value="DONE" />
            <button type="submit">DONE</button>
          </form>
        `;

    return `
      <tr>
        <td><a href="/outbox/leads/${id}?token=${encodeURIComponent(req.query.token || "")}">${id.slice(-8)}</a></td>
        <td>${created}</td>
        <td>${st}</td>
        <td>${module}</td>
        <td>${wa}</td>
        <td>${emp}</td>
        <td>${prod}</td>
        <td>${name}</td>
        <td>${company}</td>
        <td>${email}</td>
        <td>${actionHtml}</td>
      </tr>
    `;
  })
  .join("");

    
   
    const nav = (p) =>
      `/outbox/leads?token=${encodeURIComponent(req.query.token || "")}&status=${encodeURIComponent(
        status
      )}&limit=${limit}&page=${p}`;

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Outbox Leads</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 16px; }
    .bar { display:flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; vertical-align: top; }
    th { background: #f6f6f6; text-align: left; }
    a { text-decoration: none; }
    .muted { color:#666; }
    .pager { display:flex; gap:10px; margin-top: 12px; align-items: center; }
    button { cursor:pointer; }
    input, select { padding:6px; }
  </style>
</head>
<body>
  <h2>Outbox Leads</h2>

  <div class="bar">
    <form method="GET" action="/outbox/leads">
      <input type="hidden" name="token" value="${escapeHtml(req.query.token || "")}" />
      <label>Status:</label>
      <select name="status">
        ${["NEW", "SENT_EMAIL", "DONE", "ERROR", "ALL"]
          .map((s) => `<option value="${s}" ${s === status ? "selected" : ""}>${s}</option>`)
          .join("")}
      </select>
      <label>Limit:</label>
      <select name="limit">
        ${[10, 25, 50, 100]
          .map((n) => `<option value="${n}" ${n === limit ? "selected" : ""}>${n}</option>`)
          .join("")}
      </select>
      <button type="submit">Filtrar</button>
      <a class="muted" href="/outbox/leads?token=${encodeURIComponent(req.query.token || "")}&format=json">Ver JSON</a>
      <a class="muted"  href="/outbox/leads?token=${encodeURIComponent(req.query.token || "")}&status=${encodeURIComponent(status)}&format=csv&export_limit=5000">CSV (todo)</a>


    </form>
  </div>

  <div class="muted">Total: ${total} | Página ${page} de ${totalPages}</div>

  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Created</th>
        <th>Status</th>
        <th>Module</th>
        <th>wa_id</th>
        <th>Employees</th>
        <th>Products</th>
        <th>Name</th>
        <th>Empresa</th>
        <th>Email</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="11">Sin resultados</td></tr>`}
    </tbody>
  </table>

  <div class="pager">
    <a href="${nav(Math.max(page - 1, 1))}">◀ Prev</a>
    <a href="${nav(Math.min(page + 1, totalPages))}">Next ▶</a>
  </div>

  <p class="muted">Tip: abre con <code>?token=TU_TOKEN</code> o manda header <code>x-admin-token</code>.</p>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

const getOutboxLeadDetail = async (req, res) => {
  try {
    if (!requireAdmin(req)) return res.status(401).send("Unauthorized");

    const id = req.params.id;
    const doc = await OutboxLead.findById(id).lean();
    if (!doc) return res.status(404).send("Not found");

    const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>Outbox Lead</title>
<style>body{font-family:Arial;padding:16px} pre{background:#f6f6f6;padding:12px;border:1px solid #ddd;overflow:auto}</style>
</head><body>
  <a href="/outbox/leads?token=${encodeURIComponent(req.query.token || "")}">← Volver</a>
  <h3>Outbox Lead</h3>
  <pre>${escapeHtml(JSON.stringify(doc, null, 2))}</pre>
</body></html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

// Para el form HTML (application/x-www-form-urlencoded)
const setOutboxLeadStatus = async (req, res) => {
  try {
    if (!requireAdmin(req)) return res.status(401).send("Unauthorized");

    const id = req.params.id;
    const status = String(req.body.status || "").toUpperCase();

    const allowed = ["NEW", "SENT_EMAIL", "DONE", "ERROR"];
    if (!allowed.includes(status)) return res.status(400).send("Invalid status");

    await OutboxLead.updateOne({ _id: id }, { $set: { status } });

    return res.redirect(`/outbox/leads?token=${encodeURIComponent(req.query.token || "")}`);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
};

module.exports = { listOutboxLeads, getOutboxLeadDetail, setOutboxLeadStatus };
