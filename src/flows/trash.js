 // C3) Beneficios - Paso 1
    if (currentState === "BENEFICIOS_PREGUNTA_1") {
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
        nextState = "NO_CALIFICADO";
        return { messageToSend, nextState, mutateConversation };
      }

      if (!employeeCount || products.length === 0) {
        messageToSend = buildBenefitsIntro();
        nextState = "BENEFICIOS_PREGUNTA_1";
        return { messageToSend, nextState, mutateConversation };
      }

      if (employeeCount < 20) {
        messageToSend = {
          type: "text",
          text: {
            body:
              "Gracias. Por ahora atendemos programas de beneficios para empresas con al menos 20 empleados.\n" +
              "Si en el futuro crecen, con gusto les apoyamos.",
          },
        };
        nextState = "NO_CALIFICADO";
        return { messageToSend, nextState, mutateConversation };
      }

      // Mutación de conversación (guardar benefits)
      mutateConversation = (userConversation) => {
        ensureConversationData(userConversation);
        userConversation.conversation_data.benefits = {
          employee_count: employeeCount,
          products,
        };
        userConversation.markModified("conversation_data");
      };

      messageToSend = buildBenefitsAskContact(employeeCount, products);
      nextState = "BENEFICIOS_PIDE_CONTACTO";
      return { messageToSend, nextState, mutateConversation };
    }

    // C4) Beneficios - Paso 2 (contacto)
    if (currentState === "BENEFICIOS_PIDE_CONTACTO") {
      const parsed = parseContactBlock(textBody);
      const ok = parsed.name && parsed.role && parsed.company && parsed.email && isValidEmail(parsed.email);

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
        nextState = "BENEFICIOS_PIDE_CONTACTO";
        return { messageToSend, nextState, mutateConversation };
      }

      mutateConversation = (userConversation) => {
        ensureConversationData(userConversation);
        userConversation.conversation_data.contact = {
          name: parsed.name,
          role: parsed.role,
          company: parsed.company,
          email: parsed.email,
        };
        userConversation.markModified("conversation_data");
      };

      messageToSend = {
        type: "text",
        text: { body: "Gracias por responder, estamos procesando tus datos. Nos pondremos en contacto en breve." },
      };
      nextState = "BENEFICIOS_FIN";
      return { messageToSend, nextState, mutateConversation };
    }