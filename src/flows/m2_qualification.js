// src/flows/m2_qualification.js
const rules = require("../config/rules");
const { buildRescueNoTarget } = require("../utils/ui");

const {
  extractEmployeeCount,
  extractBenefitsProducts,
  looksPersonal,
  isValidEmail,
  parseContactBlock,
  ensureConversationData,
} = require("../utils/extractors");

const buildBenefitsIntro = () => ({
  type: "text",
  text: {
    body:
      "Perfecto. Te apoyo con programas de beneficios (GMM, Vida, Dental, Visión).\n\n" +
      "Para avanzar dime:\n" +
      "1) ¿Cuántos empleados tienen?\n" +
      "2) ¿Qué coberturas te interesan?\n\n" +
      'Ejemplo: "Somos 35 y queremos GMM + Dental".',
  },
});

const buildBenefitsAskContact = (employeeCount, products) => ({
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
});

/**
 * Maneja:
 * - botón BENEFICIOS (interactive)
 * - estados BENEFICIOS_PREGUNTA_1 y BENEFICIOS_PIDE_CONTACTO (text)
 *
 * Retorna null si NO aplica para que el router principal siga con otra lógica.
 */
const handleM2Qualification = ({ currentState, type, textBody, buttonId }) => {
  // 1) Entrada por botón "BENEFICIOS"
  if (type === "interactive" && buttonId === "BENEFICIOS") {
    // Guard: si ya estás en el flujo, no reinicies
    if (currentState === "BENEFICIOS_PREGUNTA_1" || currentState === "BENEFICIOS_PIDE_CONTACTO") {
      return {
        messageToSend: {
          type: "text",
          text: { body: "Ya estamos en el flujo de Beneficios 🙂 Responde la última pregunta para avanzar." },
        },
        nextState: currentState,
        mutateConversation: null,
      };
    }

    return {
      messageToSend: buildBenefitsIntro(),
      nextState: "BENEFICIOS_PREGUNTA_1",
      mutateConversation: null,
    };
  }

  // 2) Texto en paso 1
  if (type === "text" && currentState === "BENEFICIOS_PREGUNTA_1") {
    const employeeCount = extractEmployeeCount(textBody);
    const products = extractBenefitsProducts(textBody);
    const personal = looksPersonal(textBody);
    const disq = rules.qualification.disqualify_patterns.some((rx) => rx.test(textBody || ""));
    if (disq) {
    return {
        messageToSend: buildRescueNoTarget(
        "Gracias. Este canal es solo para programas corporativos (empresas).\n\n" +
        "Si sí eres empresa, toca “Soy empresa”. Si no, vuelve al menú."
        ),
        nextState: "NO_CALIFICADO",
        mutateConversation: null,
    };
    }


    if (personal) {
      return {
        messageToSend: {
          type: "text",
          text: {
            body:
              "Gracias. Por ahora Surexs atiende programas corporativos para empresas (beneficios para empleados). " +
              "Si buscas algo personal, en este canal no lo gestionamos.",
          },
        },
        nextState: "NO_CALIFICADO",
        mutateConversation: null,
      };
    }

    if (!employeeCount || products.length === 0) {
      return {
        messageToSend: buildBenefitsIntro(),
        nextState: "BENEFICIOS_PREGUNTA_1",
        mutateConversation: null,
      };
    }
    const minEmployees = rules.qualification.min_employees;
    if (employeeCount < minEmployees) {
      return {
        messageToSend: {
          type: "text",
          text: {
            body:
                `Gracias. Por ahora atendemos programas de beneficios para empresas con al menos ${minEmployees} empleados.\n` +
                "Si en el futuro crecen, con gusto les apoyamos.",
          },
        },
        nextState: "NO_CALIFICADO",
        mutateConversation: null,
      };
    }

    // Guardar benefits
    const mutateConversation = (userConversation) => {
      ensureConversationData(userConversation);
      userConversation.conversation_data.benefits = {
        employee_count: employeeCount,
        products,
      };
      userConversation.markModified("conversation_data");
    };

    return {
      messageToSend: buildBenefitsAskContact(employeeCount, products),
      nextState: "BENEFICIOS_PIDE_CONTACTO",
      mutateConversation,
    };
  }

    // 3) Texto en paso 2 (contacto)
  if (type === "text" && currentState === "BENEFICIOS_PIDE_CONTACTO") {
    const parsed = parseContactBlock(textBody);
    const req = rules.qualification.required_contact_fields;

    const hasAll = req.every((k) => {
      if (k === "email") return parsed.email && isValidEmail(parsed.email);
      return !!parsed[k];
    });

    if (!hasAll) {
      return {
        messageToSend: {
          type: "text",
          text: {
            body:
              "Casi listo 🙂 Solo necesito estos 4 datos en un mismo mensaje:\n" +
              "• Nombre\n• Puesto\n• Empresa\n• Correo\n\n" +
              "Ejemplo:\n" +
              "Nombre: Ana López\nPuesto: RH\nEmpresa: ACME\nCorreo: ana@acme.com",
          },
        },
        nextState: "BENEFICIOS_PIDE_CONTACTO",
        mutateConversation: null,
      };
    }

    const mutateConversation = (userConversation) => {
      ensureConversationData(userConversation);
      userConversation.conversation_data.contact = {
        name: parsed.name,
        role: parsed.role,
        company: parsed.company,
        email: parsed.email,
      };
      userConversation.markModified("conversation_data");
    };

    return {
      messageToSend: {
        type: "text",
        text: { body: "Gracias por responder, estamos procesando tus datos. Nos pondremos en contacto en breve." },
      },
      nextState: "BENEFICIOS_FIN",
      mutateConversation,
    };
  }


  // No aplica para M2
  return null;
};

module.exports = { handleM2Qualification };
