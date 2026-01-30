// src/handlers/messageHandler.js
// ------------------------------------------------------------
// Este handler es el "cerebro" del bot:
// 1) Normaliza wa_id
// 2) Carga/crea conversación en Mongo
// 3) Idempotencia por messageId (evita duplicados)
// 4) Decide respuesta según estado + tipo de mensaje
// 5) Guarda estado/datos y envía respuesta por WhatsApp API
//
// Fix principal para tu caso ("no sale conversation_data"):
// - Asegurar que conversation_data exista SIEMPRE (aunque sea {})
// - Marcar cambios en subdocumentos Mixed (markModified)
// - NO hacer un save “temprano” que te deje el doc con {} y luego no se refresque en Compass
//   (igual puedes hacerlo, pero aquí lo dejamos robusto y claro)
// ------------------------------------------------------------
// import { STATES, STATE_ALIASES } from "../constants/states.js";
// src/handlers/messageHandler.js
const { STATES, STATE_ALIASES } = require("../constants/states.js");
const whatsappService = require("../services/whatsappService");
const UserConversation = require("../models/UserConversation");
const logger = require("../utils/logger");

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

  return out;
};

// Helper: asegura que exista conversation_data y (cuando es Mixed)
// nos permite forzar a Mongoose a reconocer cambios anidados.
const ensureConversationData = (userConversation) => {
  if (!userConversation.conversation_data || typeof userConversation.conversation_data !== "object") {
    userConversation.conversation_data = {};
  }
};

// ------------------------------------------------------------
// MAIN HANDLER
// ------------------------------------------------------------
const handleIncomingMessage = async (messageData) => {
  const { messageId, from, type, textBody, buttonId } = messageData;

  const wa_id = normalizeToWaId(from);
  logger.info("🧩 handler: wa_id =", wa_id);

  // 1) Cargar / crear conversación
  let userConversation = await UserConversation.findOne({ wa_id });

  if (!userConversation) {
    userConversation = new UserConversation({ wa_id });
    logger.info(`📝 Nuevo usuario: ${wa_id} (estado: ${userConversation.current_state})`);
  } else {
    logger.info(`📝 Usuario existente: ${wa_id} (estado: ${userConversation.current_state})`);
  }
   // 1.0) Normaliza estados legacy a la nueva convención (sin romper BD actual)
  if (userConversation.current_state && STATE_ALIASES[userConversation.current_state]) {
    userConversation.current_state = STATE_ALIASES[userConversation.current_state];
  }

  // Si por alguna razón current_state viene vacío, caemos a menú
  if (!userConversation.current_state) {
    userConversation.current_state = STATES.SYS_MENU;
  }

  // 1.1) Guardar wa_id_raw (solo debug/auditoría)
  userConversation.wa_id_raw = String(from);

  // 1.2) Asegurar conversation_data (para que exista desde el primer save)
  ensureConversationData(userConversation);

  // 1.3) Timestamp de interacción (siempre)
  userConversation.last_interaction_at = Date.now();

  // 2) Idempotencia por messageId:
  // Si Meta reintenta el mismo webhook, ignoramos para no responder 2 veces.
  if (messageId && userConversation.last_message_id === messageId) {
    logger.warn(`♻️ Duplicate message detected, ignoring. messageId=${messageId}`);
    return;
  }

  // Registramos messageId y último texto (sin hacer "save temprano" obligatorio).
  // OJO: si se cae el proceso antes del save final, podrías reprocesar,
  // pero por simplicidad dejamos un solo save final (más claro) y sigue siendo robusto.
  if (messageId) userConversation.last_message_id = messageId;
  if (type === "text" && textBody) userConversation.last_message_text = textBody;

  // 3) Respuesta a enviar
  let messageToSend = null;

  // ------------------------------------------------------------
  // 4) Lógica por estado / tipo
  // ------------------------------------------------------------

  // A) Estado INICIO: muestra menú principal (botones)
  if (userConversation.current_state === "INICIO") {
    messageToSend = {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: "Hola bienvenido al robot Surexs 666, ¿Qué puedo hacer por ti hoy?" },
        action: {
          buttons: [
            { type: "reply", reply: { id: "INFO_SUREXS", title: "Info sobre Surexs" } },
            { type: "reply", reply: { id: "COTIZAR_SEGUROS", title: "Quiero cotizar" } },
            // IMPORTANTE: title máx 20 chars (ya lo ajustaste)
            { type: "reply", reply: { id: "BENEFICIOS", title: "Beneficios(GMM)" } },
          ],
        },
      },
    };
        userConversation.current_state = STATES.SYS_MENU;
  }

  // B) Mensajes interactivos (botones)
  else if (type === "interactive") {
    switch (buttonId) {
      case "INFO_SUREXS":
        messageToSend = {
          type: "text",
          text: { body: "Surexs ofrece seguros para empresas. Más info: surexs.com" },
        };
        userConversation.current_state = "INFO_ENVIADA";
        break;

      case "COTIZAR_SEGUROS":
        messageToSend = {
          type: "text",
          text: { body: "Perfecto. ¿Tu empresa es mediana o grande y cuántos empleados tiene?" },
        };
        userConversation.current_state = "INICIO_COTIZACION";
        break;

            case "BENEFICIOS":
        // Guard: si ya está en el flujo de Beneficios, no lo reinicies.
        if (
          userConversation.current_state === "BENEFICIOS_PREGUNTA_1" ||
          userConversation.current_state === "BENEFICIOS_PIDE_CONTACTO"
        ) {
          messageToSend = {
            type: "text",
            text: { body: "Ya estamos en el flujo de Beneficios 🙂 Responde la última pregunta para avanzar." },
          };
          break;
        }

        messageToSend = {
          type: "text",
          text: {
            body:
              "Perfecto. Te apoyo con programas de beneficios (GMM, Vida, Dental, Visión).\n\n" +
              "Para avanzar dime:\n" +
              "1) ¿Cuántos empleados tienen?\n" +
              "2) ¿Qué coberturas te interesan?\n\n" +
              'Ejemplo: "Somos 35 y queremos GMM + Dental".',
          },
        };
        userConversation.current_state = "BENEFICIOS_PREGUNTA_1";
        break;

      default:
        messageToSend = {
          type: "text",
          text: { body: "Opción no reconocida. Elige una opción del menú." },
        };
        userConversation.current_state = STATES.SYS_MENU;
        break;
    }
  }

  // C) Mensajes de texto (aquí vive el piloto)
  else if (type === "text") {
    const lower = (textBody || "").trim().toLowerCase();

    // C1) Comando menú/reset: siempre regresa menú
    if (lower === "menu" || lower === "menú" || lower === "inicio" || lower === "reset") {
      messageToSend = {
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: "¿Qué puedo hacer por ti hoy?" },
          action: {
            buttons: [
              { type: "reply", reply: { id: "INFO_SUREXS", title: "Info sobre Surexs" } },
              { type: "reply", reply: { id: "COTIZAR_SEGUROS", title: "Quiero cotizar" } },
              { type: "reply", reply: { id: "BENEFICIOS", title: "Beneficios(GMM)" } },
            ],
          },
        },
      };
      userConversation.current_state = STATES.SYS_MENU;
    }

    // C2) Si está en MENU_PRINCIPAL y manda texto: re-mostramos el menú
    else if (userConversation.current_state === STATES.SYS_MENU) {
      messageToSend = {
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: "Elige una opción del menú:" },
          action: {
            buttons: [
              { type: "reply", reply: { id: "INFO_SUREXS", title: "Info sobre Surexs" } },
              { type: "reply", reply: { id: "COTIZAR_SEGUROS", title: "Quiero cotizar" } },
              { type: "reply", reply: { id: "BENEFICIOS", title: "Beneficios(GMM)" } },
            ],
          },
        },
      };
      // Se mantiene MENU_PRINCIPAL
    }

    // C3) PILOTO V0: Beneficios - Paso 1 (empleados + coberturas)
    else if (userConversation.current_state === "BENEFICIOS_PREGUNTA_1") {
      const employeeCount = extractEmployeeCount(textBody);
      const products = extractBenefitsProducts(textBody);
      const personal = looksPersonal(textBody);

      if (personal) {
        messageToSend = {
          type: "text",
          text: {
            body:
              "Gracias. Por ahora Surexs atiende programas corporativos para empresas (beneficios para empleados). " +
              "Si buscas algo personal, en este canal no lo gestionamos.",
          },
        };
        userConversation.current_state = STATES.M1_NOT_TARGET_END;
      } else if (!employeeCount || products.length === 0) {
        messageToSend = {
          type: "text",
          text: {
            body:
              "Para avanzar necesito 2 datos:\n" +
              "1) ¿Cuántos empleados tienen?\n" +
              "2) ¿Qué coberturas te interesan (GMM, Vida, Dental, Visión)?\n\n" +
              'Ejemplo: "Somos 35 y queremos GMM + Dental".',
          },
        };
        // Se queda en BENEFICIOS_PREGUNTA_1
      } else if (employeeCount < 20) {
        messageToSend = {
          type: "text",
          text: {
            body:
              "Gracias. Por ahora atendemos programas de beneficios para empresas con al menos 20 empleados.\n" +
              "Si en el futuro crecen, con gusto les apoyamos.",
          },
        };
        userConversation.current_state = STATES.M1_NOT_TARGET_END;
      } else {
        // Guardar data estructurada
        ensureConversationData(userConversation);
        userConversation.conversation_data.benefits = {
          employee_count: employeeCount,
          products,
        };

        // CRÍTICO: cuando el campo es Mixed, Mongoose a veces NO detecta cambios anidados
        // si solo mutas "conversation_data.benefits". Esto fuerza el tracking.
        userConversation.markModified("conversation_data");

        messageToSend = {
          type: "text",
          text: {
            body:
              `Perfecto. Confirmo:\n` +
              `• Empleados: ${employeeCount}\n` +
              `• Coberturas: ${products.join(", ")}\n\n` +
              `Ahora compárteme por favor:\n` +
              `• Nombre\n• Puesto\n• Empresa\n• Correo\n\n` +
              `Ejemplo:\n` +
              `Nombre: Ana López\nPuesto: RH\nEmpresa: ACME\nCorreo: ana@acme.com`,
          },
        };
        userConversation.current_state = "BENEFICIOS_PIDE_CONTACTO";
      }
    }

    // C4) PILOTO V0: Beneficios - Paso 2 (captura contacto)
    else if (userConversation.current_state === "BENEFICIOS_PIDE_CONTACTO") {
      const parsed = parseContactBlock(textBody);

      const ok =
        parsed.name &&
        parsed.role &&
        parsed.company &&
        parsed.email &&
        isValidEmail(parsed.email);

      if (!ok) {
        messageToSend = {
          type: "text",
          text: {
            body:
              "Casi listo 🙂 Solo necesito estos 4 datos en un mismo mensaje:\n" +
              "• Nombre\n• Puesto\n• Empresa\n• Correo\n\n" +
              "Ejemplo:\n" +
              "Nombre: Ana López\nPuesto: RH\nEmpresa: ACME\nCorreo: ana@acme.com",
          },
        };
        // Se queda en BENEFICIOS_PIDE_CONTACTO
      } else {
        ensureConversationData(userConversation);
        userConversation.conversation_data.contact = {
          name: parsed.name,
          role: parsed.role,
          company: parsed.company,
          email: parsed.email,
        };

        // CRÍTICO: mismo motivo (Mixed)
        userConversation.markModified("conversation_data");

        messageToSend = {
          type: "text",
          text: {
            body: "Gracias por responder, estamos procesando tus datos. Nos pondremos en contacto en breve.",
          },
        };
        userConversation.current_state = "BENEFICIOS_FIN";
      }
    }

    // C5) Default: si NO estamos en un estado activo del piloto, regresamos al menú
    else {
      messageToSend = {
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: "Elige una opción del menú:" },
          action: {
            buttons: [
              { type: "reply", reply: { id: "INFO_SUREXS", title: "Info sobre Surexs" } },
              { type: "reply", reply: { id: "COTIZAR_SEGUROS", title: "Quiero cotizar" } },
              { type: "reply", reply: { id: "BENEFICIOS", title: "Beneficios(GMM)" } },
            ],
          },
        },
      };

      // recomendado: normalizamos estado al menú
      userConversation.current_state = STATES.SYS_MENU;
    }
  }

  // D) Otros tipos
  else {
    messageToSend = {
      type: "text",
      text: { body: "Por ahora solo procesamos texto o botones." },
    };
    userConversation.current_state = STATES.SYS_MENU;
  }

  // 5) Guardar DB (estado + conversation_data, etc.)
  // Si conversation_data está vacío, con minimize:false en el schema, igual se verá en Compass.
  await userConversation.save();

  // Log extra para verificar lo que realmente se guardó
  logger.info(
    `💾 Guardado OK: wa_id=${wa_id}, state=${userConversation.current_state}, last_message_id=${userConversation.last_message_id}, conversation_data=${JSON.stringify(
      userConversation.conversation_data || {}
    )}`
  );

  // 6) Validación final antes de enviar
  if (!messageToSend) {
    logger.warn("⚠️ messageToSend quedó null. No envío nada para evitar crash.");
    return;
  }

  // 7) Enviar respuesta
  await whatsappService.SendWhatsAppMessage(wa_id, messageToSend);
  logger.info("✅ Respuesta enviada.");
};

module.exports = { handleIncomingMessage };