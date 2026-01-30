Canon unificado v1.1 (ajustado)
1) Objetivo del proyecto

Construir un chatbot en WhatsApp para Surexs que funcione como portero B2B con foco en:

Entender intención (muchos usuarios llegan con dudas, info general o seguros patrimoniales individuales)

Convertir a lead solo cuando aplique (B2B/empresarial)

Capturar y ordenar datos de manera estructurada

Entregar esos datos fuera de WhatsApp de forma práctica (DB interna y/o notificación por correo)

Mantener el enfoque data-first: eficiencia, control del flujo y limpieza de datos (no conversación humana)

2) Arquitectura por módulos (la nueva definición correcta)
Módulo 1 — Conversación de intención + encuadre (Gate de “¿qué busca?”)

Función: manejar el “ruido” de entrada.

Identifica si el usuario:

quiere saber de Surexs / servicios

trae una duda general relacionada

busca seguros patrimoniales/individuales (no atendemos)

sí trae necesidad empresarial (potencial lead)

Responde breve (sin largos FAQs) y redirige:

si no es target → rechazo amable / orientación

si puede ser empresarial → pasa al módulo 2

Aquí puede vivir “semi-RAG” después, pero en V1 basta con clasificación por intención y respuestas cortas.

Módulo 2 — Calificación de lead (filtro B2B)

Función: ya que entendimos intención, ahora sí:

Confirma que es B2B

Pide los campos mínimos para calificar (umbrales aún por definir)

Decide Califica / No califica

Si califica: pasa al módulo 3

Módulo 3 — Procesamiento y ordenamiento de datos (data cleaning + entrega)

Función: convertir conversación en registro útil.

Normaliza campos (empresa, giro, tamaño, tipo de seguro, flotilla, etc.)

Valida formatos (correo/teléfono, números, rangos)

Produce un payload estructurado y lo “entrega” por canales internos:

Guardado en DB interna (Mongo u otra)

y/o correo de notificación al equipo (lead listo para carga manual)

No envía a HubSpot en V1

3) Salidas del sistema (NO HubSpot directo)

En V1 el “handoff” del lead se hace así:

Opción A: guardar en DB (colección leads o outbox_leads)

Opción B: email tipo notificación (con resumen + JSON/tabla)

Opción C: ambas (recomendado)

Luego, el proceso manual (o semiautomático) lo cargará a HubSpot.

4) Reglas de negocio (placeholder, NO finales)

Las “reglas duras” todavía no están cerradas.

Lo único canónico por ahora:

existe un bloque de reglas para descalificar

existe un bloque de reglas para calificar

y se implementarán como configuración (no hardcode fijo) para poder iterar

Ejemplo de estructura (sin fijar valores):

min_employees

min_vehicles

disqualifying_intents (patrimonial individual, 1 auto, etc.)

required_fields_when_qualified (contacto, empresa, etc.)

5) Estado técnico real (lo que ya está funcionando)

Esto se mantiene del resumen 2 como “hechos”:

WhatsApp Cloud API conectada

Webhook Node/Express recibiendo messages y statuses

Mongo con 1 documento por usuario (wa_id normalizado)

current_state como máquina de estados

idempotencia con last_message_id

conversation_data ya se guarda bien (fix ensureConversationData + markModified("conversation_data"))

Flujo piloto V0 “Beneficios” probado end-to-end

6) Qué sigue (alineado a esta versión)

Convertir el flujo V0 en framework reutilizable para:

Módulo 1 (intención) con rutas claras (info / no-target / empresarial)

Módulo 2 (calificación) con campos mínimos y reglas configurables

Módulo 3 (processing) generando payload + guardado DB/email