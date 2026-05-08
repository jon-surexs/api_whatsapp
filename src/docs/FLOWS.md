# Flujos Conversacionales

El chatbot funciona mediante navegación guiada por botones.

No existe interpretación libre de intención.

---

# Flujo Principal

INICIO
↓
SYS_MENU
↓
M2_INTAKE
↓
M2_DONE

---

# Menú Principal

Opciones actuales:

1. Cotizar seguros
2. Información sobre Surexs
3. Contactar asesor

---

# Reset Global

Las siguientes palabras reinician conversación:

- menu
- menú
- inicio
- reset

Estas llevan al usuario nuevamente a SYS_MENU.

---

# Flujo Cotizar Seguros

Botón:
COTIZAR_SEGUROS

Opciones:
- Beneficios
- Flotillas
- Otros seguros

Cada opción inicia un producto M2 independiente.

---

# Flujo Información Surexs

Botón:
INFO_SUREXS

Responde información institucional y vuelve al menú.

---

# Flujo Contactar Asesor

Botón:
CONTACT_ADVISOR

Inicia flujo M2 de contacto.

---

# M2 Engine

El motor M2 ejecuta:

1. Step actual
2. Validación
3. Persistencia
4. Avance
5. Payload final

---

# Persistencia Conversacional

La conversación se almacena en:

UserConversation

Campos importantes:
- current_state
- conversation_data
- current_step
- product

---

# Finalización De Flujo

Al finalizar:
- se genera OutboxLead
- puede dispararse email
- estado cambia a M2_DONE

---

# Edge Cases

## Usuario manda texto libre

El bot redirige al menú principal.

---

## Usuario presiona botones inválidos

El bot responde fallback de menú.

---

## Conversaciones legacy

Estados M1 antiguos deben normalizarse al menú.

---

# Productos Actuales

## benefits

Captura:
- empresa
- empleados
- contacto

---

## fleet

Captura:
- cantidad vehículos
- tipo flotilla
- contacto

---

## other_insurance

Captura:
- tipo seguro
- descripción
- contacto

---

## contact_advisor

Captura:
- nombre
- teléfono
- mensaje