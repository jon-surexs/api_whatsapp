# Arquitectura General

Este proyecto es un chatbot de WhatsApp orientado a seguros empresariales.

La arquitectura actual está basada en un flujo completamente button-driven y un motor conversacional modular (M2 Engine).

NO se utilizan clasificadores automáticos de intención ni IA libre.

---

# Flujo Principal

WhatsApp Cloud API
↓
Webhook Express
↓
Controllers
↓
Message Handler
↓
routeMessage
↓
UI / Menú principal
↓
M2 Engine
↓
Productos
↓
OutboxLead
↓
WhatsApp Response

---

# Capas Del Sistema

## 1. Webhook

Archivo principal:

src/routes/routes.js

Responsabilidad:
- Exponer endpoints GET /whatsapp y POST /whatsapp
- Verificar webhook de Meta
- Recibir mensajes entrantes

---

## 2. Controllers

Archivo principal:

src/controllers/whatsappControllers.js

Responsabilidad:
- Procesar payloads entrantes
- Extraer mensajes
- Delegar al messageHandler

---

## 3. Message Handler

Archivo principal:

src/handlers/messageHandler.js

Responsabilidad:
- Normalizar mensajes
- Cargar conversación Mongo
- Detectar duplicados
- Ejecutar routeMessage
- Persistir estados
- Enviar respuestas
- Crear OutboxLead

---

## 4. routeMessage

Archivo principal:

src/flows/routeMessage.js

Responsabilidad:
- Router conversacional principal
- Resolver menú principal
- Resolver botones
- Delegar flujos al M2 Engine

IMPORTANTE:
routeMessage NO debe contener lógica compleja de productos.

---

## 5. M2 Engine

Archivo principal:

src/flows/m2_engine.js

Responsabilidad:
- Ejecutar captura step-by-step
- Validar respuestas
- Avanzar steps
- Construir payload final

El motor es genérico y reutilizable.

---

## 6. Productos

Ubicación:

src/flows/products/

Cada producto define:
- steps
- validaciones
- mensajes
- payload final

Productos actuales:
- benefits.js
- fleet.js
- other_insurance.js
- contact_advisor.js

---

## 7. Persistencia

MongoDB Atlas

Colecciones principales:
- UserConversation
- OutboxLead

---

# Estados Conversacionales

Estados principales:

- INICIO
- SYS_MENU
- M2_INTAKE
- M2_DONE

---

# Filosofía Conversacional

Este proyecto NO usa:
- NLP
- Intent classification
- IA libre
- extracción automática de intención

Todo el flujo debe ser guiado mediante:
- botones
- listas
- respuestas dirigidas

---

# Legacy / Deprecated

Ubicación:

src/deprecated/

Contiene:
- M1 antiguo
- clasificadores de intención
- pruebas legacy

No deben reutilizarse en runtime.

---

# Reglas Arquitectónicas

## Regla 1

routeMessage solo enruta.

## Regla 2

La lógica de captura vive en M2 Engine.

## Regla 3

Cada producto vive aislado.

## Regla 4

Los estados conversacionales viven en Mongo.

## Regla 5

No agregar IA libre sin rediseño arquitectónico.

---

# Logs

Actualmente existen dos sistemas de logs:
- Winston logs/
- logs.txt legacy

Pendiente consolidación futura.

---

# Variables Críticas

Variables sensibles:
- WHATSAPP_TOKEN
- PHONE_NUMBER_ID
- VERIFY_TOKEN
- MONGODB_URI

Nunca deben versionarse.