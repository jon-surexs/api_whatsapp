1. Resumen ultra corto
        Este proyecto es un chatbot de WhatsApp para seguros empresariales.

        El flujo es completamente guiado por botones (button-driven), sin IA conversacional libre.

        El sistema recibe mensajes desde WhatsApp Cloud API, procesa estados conversacionales en MongoDB y ejecuta flujos modulares mediante un motor llamado M2 Engine.

        Cada producto (beneficios, flotillas, otros seguros, contacto asesor) vive como un módulo independiente.



2. Flujo técnico corto

        WhatsApp envía mensajes al webhook de Express.

        El controller recibe el payload y lo manda al messageHandler.

        messageHandler:
        - normaliza mensajes
        - carga conversación Mongo
        - detecta duplicados
        - ejecuta routeMessage

        routeMessage:
        - controla menú principal
        - resuelve botones
        - delega flujos al M2 Engine

        M2 Engine:
        - ejecuta captura step-by-step
        - valida respuestas
        - construye payload final

        Al finalizar:
        - se guarda OutboxLead
        - opcionalmente se envía email
        - se responde al usuario vía WhatsApp Cloud API.



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