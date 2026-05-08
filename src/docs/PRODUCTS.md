# Productos Conversacionales

Los productos son módulos independientes usados por el M2 Engine.

Ubicación:

src/flows/products/

---

# Estructura General

Cada producto exporta un objeto con:

- id
- name
- steps
- finalPayload

---

# Registro De Productos

Archivo:

src/flows/productsRegistry.js

Todos los productos deben registrarse aquí.

---

# Crear Un Nuevo Producto

## 1. Crear archivo

Ejemplo:

src/flows/products/my_product.js

---

## 2. Exportar definición

Ejemplo:

module.exports = {
  id: "MY_PRODUCT",
  name: "Mi Producto",
  steps: [],
  finalPayload() {}
};

---

## 3. Agregar Steps

Cada step puede contener:
- key
- question
- validation
- transform

---

# Ejemplo Step

{
  key: "company_name",
  question: "¿Cuál es el nombre de tu empresa?",
}

---

# Validaciones

Las validaciones deben ser simples y determinísticas.

Evitar lógica compleja dentro de steps.

---

# Payload Final

finalPayload recibe la conversación y construye:

- leadData
- outboxData
- emailData

---

# Reglas Importantes

## Regla 1

Cada producto debe ser aislado.

## Regla 2

No modificar M2 Engine para lógica específica.

## Regla 3

Toda lógica específica vive dentro del producto.

## Regla 4

No usar IA o clasificación automática.

---

# Flujo Interno

Usuario
↓
Botón
↓
routeMessage
↓
M2 Engine
↓
Producto
↓
OutboxLead

---

# Productos Actuales

- benefits
- fleet
- other_insurance
- contact_advisor

---

# Buenas Prácticas

- Steps cortos
- Preguntas claras
- Validaciones simples
- Evitar bifurcaciones complejas
- Mantener compatibilidad button-driven

---

# Futuras Mejoras

Posibles mejoras futuras:
- Catálogos dinámicos
- Persistencia parcial
- Reanudación avanzada
- Multi-product intake