/**
 * leadContactParser.js
 *
 * Parser inteligente de datos de contacto enviados por el usuario.
 *
 * Permite interpretar distintos formatos de texto como:
 *
 * "Juan Perez, Director RH, ACME SA, juan@acme.com"
 *
 * o
 *
 * "Soy Juan Perez de ACME mi correo es juan@acme.com"
 *
 * Devuelve un objeto normalizado:
 *
 * {
 *   name,
 *   role,
 *   company,
 *   email
 * }
 */

function extractEmail(text) {

  /**
   * Busca emails dentro del texto
   */
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

  const match = text.match(emailRegex);

  return match ? match[0] : null;
}

function parseCommaFormat(text) {

  /**
   * Parser para formato clásico:
   *
   * Nombre, Puesto, Empresa, correo@empresa.com
   */

  const parts = text.split(",").map(p => p.trim());

  return {
    name: parts[0] || null,
    role: parts[1] || null,
    company: parts[2] || null,
    email: parts[3] || null,
  };
}

function parseNaturalLanguage(text) {

  /**
   * Parser básico de lenguaje natural
   * Detecta patrones como:
   *
   * "Soy Juan Perez de ACME mi correo es juan@acme.com"
   */

  const email = extractEmail(text);

  let name = null;
  let company = null;

  /**
   * Buscar nombre después de "soy"
   */
  const soyMatch = text.match(/soy\s+([a-zA-Z\s]+)/i);
  if (soyMatch) {
    name = soyMatch[1].trim();
  }

  /**
   * Buscar empresa después de "de"
   */
  const companyMatch = text.match(/de\s+([a-zA-Z0-9\s]+)/i);
  if (companyMatch) {
    company = companyMatch[1].trim();
  }

  return {
    name,
    role: null,
    company,
    email,
  };
}

function parseLeadContact(text) {

  /**
   * Función principal del parser
   */

  if (!text) {
    return {
      name: null,
      role: null,
      company: null,
      email: null,
    };
  }

  /**
   * Si contiene comas
   * usamos el parser estructurado
   */
  if (text.includes(",")) {
    return parseCommaFormat(text);
  }

  /**
   * Si no, usamos parser de lenguaje natural
   */
  return parseNaturalLanguage(text);
}

module.exports = {
  parseLeadContact
};