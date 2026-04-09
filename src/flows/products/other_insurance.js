// src/flows/products/other_insurance.js
/**
 * Parser inteligente de contactos
 */
const { parseLeadContact } = require("../../utils/leadContactParser");
/**
 * OTHER_INSURANCE – Motor de flujo de seguros de flotilla
 *
 * - Misma estructura que BENEFITS
 * - Entrada por botón
 * - Steps con parse, store, is_valid
 * - Evaluación de negocio aislada
 */



module.exports = {
  key: "OTHER_INSURANCE",
  label: "Otros seguros",
  entry_button_id: "OTHER_INSURANCE",

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
    id: "other_insurance_description",

    ask: () => ({
      type: "text",
      text: {
        body:
          "1/2\n\n" +
          "Cuéntanos brevemente qué tipo de seguro necesitas.\n\n" +
          "Por ejemplo:\n" +
          "- Seguro para bodega\n" +
          "- Responsabilidad civil para empresa\n" +
          "- Seguro para maquinaria\n" +
          "- Seguro de daños para negocio"
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
        "• Seguro para bodega\n" +
        "• Responsabilidad civil para empresa\n" +
        "• Seguro de daños para negocio"
    }
  }),
  },
    /**
     * STEP 2 – Captura de contacto
     * Cada producto captura sus propios datos
     */
    {
      id: "other_insurance_contact",

      ask: () => ({
        type: "text",
        text: {
          body:
            "2/2\n\n" +
            "Para enviarte la cotización compárteme:\n\n" +
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
   * Para OTHER_INSURANCE todos los leads se consideran
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

    other_insurance: {

      description: answers.description || null

    }

}),
};