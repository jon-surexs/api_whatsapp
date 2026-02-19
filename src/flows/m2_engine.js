// src/flows/m2_engine.js
const { STATES } = require("../constants/states");
const rules = require("../config/rules");
const { PRODUCTS } = require("../config/products");
const { ensureConversationData, parseContactBlock, isValidEmail } = require("../utils/extractors");

const M2 = {
  ENTRY: STATES.M2_ENTRY,
  INTAKE: STATES.M2_INTAKE,
  CONTACT: STATES.M2_CONTACT,
  DONE: STATES.M2_DONE,
};

const initM2 = (conv) => {
  ensureConversationData(conv);
  if (!conv.conversation_data.m2) {
    conv.conversation_data.m2 = {
      selected_products: [],
      active_product: null,
      active_step_index: 0,
      answers: {},
      contact: null,
    };
    conv.markModified("conversation_data");
  }
};

const detectProductsFromText = (text) => {
  const t = String(text || "");
  const hits = Object.values(PRODUCTS)
    .filter((p) => (p.detect?.keywords || []).some((rx) => rx.test(t)))
    .map((p) => p.key);
  return [...new Set(hits)];
};

const pickFirstUnfinishedProduct = (m2) => {
  for (const k of m2.selected_products) {
    const ans = m2.answers?.[k] || {};
    const steps = PRODUCTS[k]?.steps || [];
    const done = steps.every((step) => (step.is_valid ? step.is_valid(ans) : true));
    if (!done) return k;
  }
  return null;
};

const handleM2Engine = ({ currentState, type, textBody, buttonId }) => {
  const isEntryButton = Object.values(PRODUCTS).some((p) => p.entry_button_id === buttonId);

  const isSysMenu = currentState === STATES.SYS_MENU;
  const textHasProduct = type === "text" && detectProductsFromText(textBody || "").length > 0;

  if (!(isEntryButton || currentState?.startsWith("M2_") || (isSysMenu && textHasProduct))) {
    return null;
  }

  if (type === "interactive" && isEntryButton) {
    const productKey = Object.values(PRODUCTS).find((p) => p.entry_button_id === buttonId).key;

    return {
      nextState: M2.ENTRY,
      messageToSend: {
        type: "text",
        text: { body: `Perfecto. Vamos con ${PRODUCTS[productKey].label}.\n\n(Escribe "continuar" si quieres agregar otro producto.)` },
      },
      mutateConversation: (conv) => {
        initM2(conv);
        const m2 = conv.conversation_data.m2;
        if (!m2.selected_products.includes(productKey)) m2.selected_products.push(productKey);
        m2.active_product = productKey;
        m2.active_step_index = 0;
        if (!m2.answers[productKey]) m2.answers[productKey] = {};
        conv.markModified("conversation_data");
      },
    };
  }

  if (currentState === M2.ENTRY && type === "text") {
    const text = (textBody || "").trim();
    const detected = detectProductsFromText(text);

    return {
      nextState: M2.INTAKE,
      messageToSend: null,
      mutateConversation: (conv) => {
        initM2(conv);
        const m2 = conv.conversation_data.m2;

        for (const k of detected) {
          if (!m2.selected_products.includes(k)) m2.selected_products.push(k);
          if (!m2.answers[k]) m2.answers[k] = {};
        }

        if (!m2.active_product) m2.active_product = m2.selected_products[0] || "BENEFITS";
        if (!m2.answers[m2.active_product]) m2.answers[m2.active_product] = {};
        m2.active_step_index = 0;

        conv.markModified("conversation_data");
      },
      afterMutateMessageToSend: (conv) => {
        const m2 = conv.conversation_data.m2;
        const p = PRODUCTS[m2.active_product];
        return p.steps[0].ask();
      },
    };
  }

  if (currentState === M2.INTAKE && type === "text") {
    const text = (textBody || "").trim();

    return {
      nextState: M2.INTAKE,
      messageToSend: null,
      mutateConversation: (conv) => {
        initM2(conv);
        const m2 = conv.conversation_data.m2;
        const p = PRODUCTS[m2.active_product];
        const step = p.steps[m2.active_step_index] || p.steps[0];
        const ans = m2.answers[m2.active_product] || (m2.answers[m2.active_product] = {});

        const parsed = step.parse(text);
        if (!step.is_valid(parsed) && !step.is_valid(ans)) {
          conv._m2_fail_message = step.fail_message();
          return;
        }

        step.store(ans, parsed);
        m2.answers[m2.active_product] = ans;
        m2.active_step_index += 1;

        if (m2.active_step_index >= p.steps.length) {
          const nextProd = pickFirstUnfinishedProduct(m2);
          if (nextProd && nextProd !== m2.active_product) {
            m2.active_product = nextProd;
            m2.active_step_index = 0;
          } else {
            m2._go_contact = true;
          }
        }

        conv.markModified("conversation_data");
      },
      afterMutate: (conv) => {
        if (conv._m2_fail_message) return { nextState: M2.INTAKE, messageToSend: conv._m2_fail_message };

        const m2 = conv.conversation_data.m2;
        if (m2._go_contact) {
          return {
            nextState: M2.CONTACT,
            messageToSend: {
              type: "text",
              text: {
                body: "Perfecto. Ahora comparteme:\n- Nombre\n- Puesto\n- Empresa\n- Correo\n\nEj: Juan, RH, ACME, juan@acme.com",
              },
            },
          };
        }

        const p = PRODUCTS[m2.active_product];
        const step = p.steps[m2.active_step_index] || p.steps[0];
        return { nextState: M2.INTAKE, messageToSend: step.ask() };
      },
    };
  }

  if (currentState === M2.CONTACT && type === "text") {
    const parsed = parseContactBlock(textBody || "");
    const req = rules.qualification.required_contact_fields || ["name", "role", "company", "email"];

    const ok = req.every((k) => {
      if (k === "email") return parsed.email && isValidEmail(parsed.email);
      return !!parsed[k];
    });

    if (!ok) {
      return {
        nextState: M2.CONTACT,
        messageToSend: {
          type: "text",
          text: { body: "Casi listo. Mandame: Nombre, Puesto, Empresa y Correo (todo en un mensaje)." },
        },
        mutateConversation: null,
      };
    }

    return {
      nextState: M2.DONE,
      messageToSend: { type: "text", text: { body: "Gracias. Registro listo. En breve te contactamos." } },
      mutateConversation: (conv) => {
        initM2(conv);
        conv.conversation_data.m2.contact = parsed;
        conv.markModified("conversation_data");
      },
      outboxJob: {
        module: "M2_MULTI",
        payload_builder: "M2_MULTI",
        final_state: STATES.M2_DONE,
      },
    };
  }

  return null;
};

const PAYLOAD_BUILDERS = {
  M2_MULTI: ({ userConversation }) => {
    const m2 = userConversation.conversation_data?.m2 || {};
    const selected = m2.selected_products || [];
    const answers = m2.answers || {};
    const contact = m2.contact || {};

    const fragments = selected.reduce((acc, k) => {
      const p = PRODUCTS[k];
      if (!p) return acc;
      const frag = p.build_payload_fragment ? p.build_payload_fragment(answers[k] || {}) : {};
      return { ...acc, ...frag };
    }, {});

    return {
      wa_id: userConversation.wa_id,
      captured_at: new Date().toISOString(),
      selected_products: selected,
      ...fragments,
      contact,
      final_state: STATES.M2_DONE,
    };
  },
};

module.exports = { handleM2Engine, PAYLOAD_BUILDERS, M2 };
