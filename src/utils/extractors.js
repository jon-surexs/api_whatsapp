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
const parseContactBlock = (text) => {
  const out = { name: null, role: null, company: null, email: null };
  if (!text) return out;

  const emailMatch = text.match(/[^\s@]+@[^\s@]+\.[^\s@]{2,}/);
  if (emailMatch) out.email = emailMatch[0];

  const norm = text.replace(/\n/g, " ").trim();

  const grab = (labelRegex) => {
    const m = norm.match(labelRegex);
    return m ? m[1].trim() : null;
  };

  out.name = grab(/nombre\s*[:\-]\s*([^,]+?)(?=\s*(puesto|empresa|correo|email)\s*[:\-]|$)/i);
  out.role = grab(/puesto\s*[:\-]\s*([^,]+?)(?=\s*(nombre|empresa|correo|email)\s*[:\-]|$)/i);
  out.company = grab(/empresa\s*[:\-]\s*([^,]+?)(?=\s*(nombre|puesto|correo|email)\s*[:\-]|$)/i);

  // Fallback: "Juan Pérez, RH, ACME SA, juan@acme.com"
  if (!out.name || !out.role || !out.company) {
    const parts = norm.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
      if (!out.name) out.name = parts[0] || out.name;
      if (!out.role) out.role = parts[1] || out.role;
      if (!out.company) out.company = parts[2] || out.company;
    }
  }
    // Cleanup: si company trae un email pegado, se lo quitamos
  if (out.company) {
    const emailRx = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/g;
    out.company = out.company.replace(emailRx, "").replace(/\s+/g, " ").trim();
    if (!out.company) out.company = null;
  }

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