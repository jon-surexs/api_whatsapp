// src/flows/products/contact_advisor.js
/**
 * Parser inteligente de contactos
 */
const { parseLeadContact } = require("../../utils/leadContactParser");
/**
 * contact_advisor – Motor de flujo de seguros de flotilla
 *
 * - Misma estructura que BENEFITS
 * - Entrada por botón
 * - Steps con parse, store, is_valid
 * - Evaluación de negocio aislada
 */



module.exports = {
  key: "CONTACT_ADVISOR",
  label: "Contactar asesor",
  entry_button_id: "CONTACT_ADVISOR",

  steps: [
    /**
   * STEP 1 – DESCRIPCIÓN DEL SEGURO
   *
   * El usuario escribe libremente qué tipo de seguro necesita.
   * Ejemplos:
   *
   * "Necesito seguro para una bodega"
   * "Seguro de responsabilidad civil para mi empresa"
   * "Seguro para maquinaria industrial"
   *
   * WhatsApp suele enviar textos con muchos saltos de línea,
   * por lo que normalizamos el texto eliminando múltiples
   * enters y espacios innecesarios.
   */
  {
    id: "description_step",

    ask: () => ({
      type: "text",
      text: {
        body:
          "1/2\n\n" +
          "Cuéntanos brevemente cómo podemos ayudarte.\n\n" +
          "Por ejemplo:\n" +
          "- Cotizar seguros empresariales\n" +
          "- Revisar seguros actuales\n" +
          "- Asesoría para beneficios de empleados\n" +
          "- Seguros para flotillas"
      },
    }),

    /**
     * PARSER DEL MENSAJE
     *
     * Limpia saltos de línea múltiples de WhatsApp
     * y normaliza el texto a una sola línea.
     */

    parse: (text) => {

      if (!text) return { description: null };

      const normalized = text
        .replace(/\n+/g, " ")   // reemplaza múltiples saltos de línea por espacio
        .replace(/\s+/g, " ")   // elimina espacios duplicados
        .trim();

      return {
        description: normalized
      };

    },

    /**
   * VALIDACIÓN DEL MENSAJE
   *
   * Muchos usuarios escriben en varios mensajes seguidos.
   * Para evitar avanzar demasiado rápido al siguiente step,
   * exigimos una longitud mínima razonable.
   *
   * Si el mensaje es muy corto, asumimos que el usuario
   * aún está escribiendo más información.
   */

  is_valid: (a) =>
    a.description && a.description.length >= 15,

    /**
     * GUARDADO EN ANSWERS
     */

    store: (answers, parsed) => {

      answers.description = parsed.description;

    },

    /**
   * MENSAJE CUANDO EL TEXTO ES DEMASIADO CORTO
   *
   * Esto ayuda cuando el usuario envía mensajes
   * fragmentados o muy cortos.
   */

  fail_message: () => ({
    type: "text",
    text: {
      body:
        "Cuéntanos un poco más sobre el seguro que necesitas.\n\n" +
         "Por ejemplo:\n" +
          "- Cotizar seguros empresariales\n" +
          "- Revisar seguros actuales\n" +
          "- Asesoría para beneficios de empleados\n" +
          "- Seguros para flotillas"
    }
  }),
  },
    /**
     * STEP 2 – Captura de contacto
     * Cada producto captura sus propios datos
     */
    {
      id: "contact_step",

      ask: () => ({
        type: "text",
        text: {
          body:
            "2/2\n\n" +
            "Por último compártenos tu contacto. Esto es solo para dar seguimiento a tu solicitud:\n\n" +
            "Nombre, Puesto, Empresa, correo@empresa.com\n\n" +
            "Ejemplo:\nJuan Pérez, Gerente de RH, ACME, juan@acme.com"
        },
      }),

      /**
       * Parser inteligente de contacto
       * Utiliza el util compartido para interpretar
       * múltiples formatos de texto enviados por el usuario
       */

      

      parse: (text) => {

        const parsed = parseLeadContact(text);

        return {
          contact: parsed
        };
      },

      is_valid: (a) =>
        a.contact?.name &&
        a.contact?.role &&
        a.contact?.company &&
        a.contact?.email,

      store: (answers, parsed) => {
        answers.contact = parsed.contact;
      },

      fail_message: () => ({
        type: "text",
        text: {
          body:
            "Comparte los datos en este formato:\n\n" +
            "Nombre, Puesto, Empresa, correo@empresa.com"
        }
      }),
    },
  ],

  /**
   * ============================================================
   * EVALUACIÓN DE LEAD
   * ============================================================
   *
   * Para contact_advisor todos los leads se consideran
   * potencialmente válidos porque el seguro puede variar
   * mucho (RC, daños, maquinaria, bodegas, etc).
   *
   * Se asigna prioridad media por defecto.
   */

  evaluateQualification: () => {

    return {
      status: "qualified",
      priority: 2
    };

  },

   /**
   * ============================================================
   * PAYLOAD DEL PRODUCTO
   * ============================================================
   *
   * Solo guardamos los datos propios del producto.
   * El contacto lo maneja el M2_ENGINE.
   */

  build_payload_fragment: (answers) => ({

    contact_advisor: {

      description: answers.description || null

    }

}),
};