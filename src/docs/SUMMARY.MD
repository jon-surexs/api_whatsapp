# Glosario técnico

## Webhook
URL pública donde WhatsApp/Meta envía eventos y mensajes del bot.

## Payload
Objeto JSON recibido desde WhatsApp con toda la información del mensaje.

## Controller
Archivo encargado de recibir requests HTTP y delegar lógica.

## Handler
Capa central que procesa mensajes y coordina lógica conversacional.

## Router conversacional
Módulo que decide a qué flujo enviar al usuario.

## M2 Engine
Motor interno step-by-step que controla preguntas, validaciones y avance conversacional.

## MongoDB Model
Definición de cómo se almacena la información en MongoDB.

## OutboxLead
Colección/documento final generado cuando un flujo termina exitosamente.

## WhatsApp Cloud API
API oficial de Meta utilizada para enviar y recibir mensajes de WhatsApp.

## Flow
Flujo conversacional independiente para un producto o proceso.

## Button-driven
Arquitectura donde el usuario navega principalmente mediante botones y listas,
no mediante IA libre.



# Arquitectura general

WhatsApp
   ↓
Webhook Express
   ↓
Controller
   ↓
messageHandler.js
   ↓
routeMessage.js
   ↓
M2 Engine
   ↓
MongoDB + WhatsApp API




1. Resumen ultra corto
        Este proyecto es un chatbot de WhatsApp para seguros empresariales.

        El flujo es completamente guiado por botones (button-driven), sin IA conversacional libre.

        El sistema recibe mensajes desde WhatsApp Cloud API, procesa estados conversacionales en MongoDB y ejecuta flujos modulares mediante un motor llamado M2 Engine.

        Cada producto (beneficios, flotillas, otros seguros, contacto asesor) vive como un módulo independiente.



2. Flujo técnico corto

        WhatsApp envía mensajes al webhook de Express.

        routes/routes.js:
       “Este request viene desde Meta/WhatsApp,
        ¿lo dejo pasar al sistema o lo rechazo como inválido?”
        
        - expone el endpoint público del webhook
        - recibe requests desde Meta/WhatsApp

        controllers/whatsappController.js:
        “Este payload HTTP viene de WhatsApp,
        ¿es válido y qué información útil puedo extraer de él?”
        - recibe el payload HTTP
        - valida estructura básica
        - extrae mensajes/eventos
        - delega procesamiento al handlers/messageHandler.js

        handlers/messageHandler.js:
        “Este mensaje ya fue procesado antes o es nuevo,
        ¿cómo lo normalizo y qué contexto de conversación tiene el usuario?”
        - normaliza mensajes
        - carga conversación MongoDB
        - detecta duplicados
        - detecta tipo de mensaje
        - ejecuta flows/routeMessage.js

        flows/routeMessage.js:
        “Con este estado del usuario y este mensaje,
        ¿a qué flujo o módulo del sistema debo enviarlo?”

        - controla menú principal
        - resuelve botones
        - detecta flujo activo
        - delega ejecución al M2 Engine

        flows/m2_engine.js:
         “Estoy dentro de un flujo específico,
         ¿qué paso sigue, qué debo preguntar y cómo valido esta respuesta?”

         - ejecuta captura step-by-step definida por el producto
         - valida respuestas usando lógica del step actual
         - almacena respuestas en conversation_data.m2
         - avanza active_step_index del producto
         - ejecuta hooks del producto (evaluateQualification, build_payload_fragment)
         - determina finalización del flujo

         flows/productsRegistry.js:
         “¿Qué módulo de producto corresponde a este flujo?”

         - mapea intents (BENEFITS, FLEET, etc.)
         - resuelve qué archivo dentro de /products debe ejecutarse
         - funciona como catálogo central de flujos

         flows/products/*.js (ej: benefits.js):
         “¿Cómo se captura la información específica de este producto?”

         - define steps del flujo conversacional
         - implementa parse(), is_valid(), store()
         - define reglas de negocio (evaluateQualification)
         - construye fragmento de payload final (build_payload_fragment)
         - delega parsing avanzado a utils/leadContactParser cuando es necesario
         - devuelve datos estructurados al M2 Engine (no los envía directamente)


         👉 La información capturada se envía de regreso a:
         flows/m2_engine.js, donde se integra en el payload final del lead

         👉 posteriormente es procesada por:
         PAYLOAD_BUILDERS (M2_SINGLE) dentro de m2_engine.js


         👉 y finalmente enviada al sistema OUTBOX (M3 layer), donde:
         - se guarda en models/OutboxLead.js (MongoDB)
         - se pueden disparar servicios como emailService.js
         - y se responde al usuario mediante services/whatsappService.js

        Al finalizar:

        models/OutboxLead.js:
        “Ya terminé el flujo,
        ¿cómo persisto de forma estructurada la información capturada?”
        - guarda el lead final en MongoDB

        services/emailService.js:
        “Este lead o evento requiere notificación interna,
        ¿a quién y con qué formato lo envío?”
        - opcionalmente envía email interno o notificación

        services/whatsappService.js:
        “Necesito responder al usuario en WhatsApp,
        ¿cómo construyo y envío el mensaje vía Cloud API?”
        - responde al usuario vía WhatsApp Cloud API



3. Mapa rápido de archivos clave

    src/
        ├─ index.js
        │  → inicia el servidor Express y configura la aplicación
        │
        ├─ routes/routes.js
        │  → expone el webhook de WhatsApp
        │  → webhook = URL pública donde Meta/WhatsApp envía mensajes y eventos del bot
        │
        ├─ controllers/
        │  → recibe payloads entrantes desde WhatsApp
        │  → payload = JSON con toda la información del mensaje recibido
        │
        ├─ handlers/messageHandler.js
        │  → núcleo conversacional
        │  → procesa mensajes, estados, Mongo y respuestas
        │
        ├─ flows/routeMessage.js
        │  → router conversacional principal
        │  → decide hacia qué flujo enviar al usuario
        │
        ├─ flows/m2_engine.js
        │  → motor step-by-step
        │  → ejecuta preguntas, validaciones y avance de pasos
        │
        ├─ flows/products/
        │  → productos modulares independientes
        │  → cada archivo representa un flujo conversacional distinto
        │
        ├─ models/
        │  → modelos MongoDB
        │  → definen cómo se guarda la información en la base de datos
        │
        ├─ services/whatsappService.js
        │  → integración con WhatsApp Cloud API de Meta
        │  → envía mensajes desde el bot hacia WhatsApp
        │
        └─ utils/ui.js
        → construcción de botones, listas y menús interactivos