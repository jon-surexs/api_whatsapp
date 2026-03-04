// utils/extractor.js
// Normaliza el número para que sea SIEMPRE la misma llave
// (ej: 521XXXXXXXXXX -> +52XXXXXXXXXX)
const normalizeToWaId = (n) => {
  let digits = String(n).replace(/\D/g, "");
  if (digits.startsWith("521") && digits.length === 13) {
    digits = "52" + digits.substring(3);
  }
  return "+" + digits;
};


// ------------------------------------------------------------
// HELPERS para PILOTO V0 de Beneficios (sin IA real aún)
// ------------------------------------------------------------
const BENEFITS_PRODUCTS = [
  { key: "GMM", patterns: [/gmm/i, /gastos\s*m[eé]dicos/i, /medical/i] },
  { key: "VIDA", patterns: [/vida/i, /life/i] },
  { key: "DENTAL", patterns: [/dental/i, /dentista/i, /odont/i] },
  { key: "VISION", patterns: [/visi[oó]n/i, /vision/i, /lentes/i, /optom/i] },
];

const extractEmployeeCount = (text) => {
  if (!text) return null;
  const m = String(text).match(/(\d{1,3}(?:[.,]\d{3})*|\d+)/);
  if (!m) return null;

  const raw = m[1].replace(/[.,]/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const extractBenefitsProducts = (text) => {
  if (!text) return [];
  const found = [];
  for (const p of BENEFITS_PRODUCTS) {
    if (p.patterns.some((rx) => rx.test(text))) found.push(p.key);
  }
  return [...new Set(found)];
};

const looksPersonal = (text) => {
  if (!text) return false;
  return /soy\s*particular|para\s*mi\b|para\s*mis\s*hijos|mi\s*familia|personal/i.test(text);
};

const isValidEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
};

// Parser básico para "Nombre, Puesto, Empresa, Correo" en un solo texto.
// ------------------------------------------------------------
// Parser tolerante para bloque de contacto.
// Acepta múltiples formatos:
// - Separados por coma
// - Separados por punto y coma
// - Sin comas (detecta email por regex)
// - Limpia espacios y emails pegados
// ------------------------------------------------------------
const parseContactBlock = (text) => {
  const out = { name: null, role: null, company: null, email: null };
  if (!text) return out;

  // Normalizamos saltos de línea y espacios múltiples
  const norm = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  // 1️⃣ Detectar email primero (independiente del orden)
  const emailMatch = norm.match(/[^\s@]+@[^\s@]+\.[^\s@]{2,}/);
  if (emailMatch) {
    out.email = emailMatch[0].trim();
  }

  // 2️⃣ Remover email del texto para no contaminar campos
  let textWithoutEmail = norm;
  if (out.email) {
    textWithoutEmail = norm.replace(out.email, "").trim();
  }

  // 3️⃣ Intentar split flexible (coma o punto y coma)
  let parts = textWithoutEmail
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 4️⃣ Si no hay suficientes partes, intentar split por bloques grandes de espacio
  if (parts.length < 3) {
    parts = textWithoutEmail
      .split(/\s{2,}/) // doble espacio como separador natural
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // 5️⃣ Asignar campos si existen
  if (parts.length >= 1) out.name = parts[0] || null;
  if (parts.length >= 2) out.role = parts[1] || null;
  if (parts.length >= 3) out.company = parts[2] || null;

  return out;
};

// Helper: asegura que exista conversation_data y (cuando es Mixed)
// nos permite forzar a Mongoose a reconocer cambios anidados.
const ensureConversationData = (userConversation) => {
  if (!userConversation.conversation_data || typeof userConversation.conversation_data !== "object") {
    userConversation.conversation_data = {};
  }
};


module.exports = {
  normalizeToWaId,
  extractEmployeeCount,
  extractBenefitsProducts,
  looksPersonal,
  isValidEmail,
  parseContactBlock,
  ensureConversationData,
};