# Deploy Del Proyecto

Este proyecto usa:
- Node.js
- Express
- MongoDB Atlas
- WhatsApp Cloud API
- ngrok (desarrollo)
- AWS EC2 (producción)

---

# Instalación Local

## Instalar dependencias

npm install

---

# Variables ENV

Crear archivo:

.env

Ejemplo:

PORT=3000

WHATSAPP_TOKEN=
PHONE_NUMBER_ID=
VERIFY_TOKEN=
MONGODB_URI=

EMAIL_ENABLED=true

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

---

# Ejecutar Proyecto

node src/index.js

Servidor esperado:

Server listening on 3000

---

# ngrok

Levantar túnel:

ngrok http 3000

Ejemplo:

https://xxxxx.ngrok-free.app

Webhook final:

https://xxxxx.ngrok-free.app/whatsapp

---

# Configuración Meta

En Meta Developers:

Webhook URL:
https://xxxxx.ngrok-free.app/whatsapp

Verify Token:
Debe coincidir con VERIFY_TOKEN

---

# MongoDB Atlas

## Crear cluster

Mongo Atlas → Cluster

---

## Crear usuario

Database Access → Add User

---

## Permitir IP

Network Access → Allow Access

Para desarrollo:
0.0.0.0/0

---

## Connection String

Ejemplo:

mongodb+srv://USER:PASSWORD@cluster.mongodb.net/surexs_whatsapp?retryWrites=true&w=majority

---

# Producción AWS

Servidor actual esperado:
- Ubuntu
- Node.js
- PM2

---

# PM2

Instalar:

npm install -g pm2

Iniciar:

pm2 start src/index.js --name apiwhatsapp

Ver logs:

pm2 logs apiwhatsapp

Reiniciar:

pm2 restart apiwhatsapp

---

# Verificación

Verificar:
- Mongo conectado
- Webhook responde
- Meta verifica endpoint
- Mensajes salen correctamente

---

# Errores Comunes

## Error 401 Meta

Token inválido o expirado.

---

## Error Mongo timeout

MONGODB_URI incorrecta.

---

## ngrok 502

Servidor Node apagado.

---

# Seguridad

Nunca subir:
- .env
- tokens Meta
- credenciales Mongo
- credenciales SMTP

Agregar siempre a .gitignore.