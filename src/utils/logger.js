// src/utils/logger.js

const fs = require('fs');
const path = require('path');

// Ruta absoluta al archivo de logs
const LOG_FILE_PATH = path.join(__dirname, '../../logs.txt');

/**
 * Escribe un mensaje de log tanto en archivo como en consola.
 * @param {string} level - Nivel del log (DEBUG, INFO, ERROR, WARN).
 * @param {string} message - El mensaje a loguear.
 * @param {any} [data] - Datos adicionales (opcional).
 */
const log = (level, message, data) => {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;

    if (data !== undefined) {
        logMessage += ` - Data: ${JSON.stringify(data, null, 2)}`;
    }

    // 🔥 1️⃣ Mostrar en consola
    switch (level) {
        case 'ERROR':
            console.error(logMessage);
            break;
        case 'WARN':
            console.warn(logMessage);
            break;
        case 'DEBUG':
            console.debug(logMessage);
            break;
        default:
            console.log(logMessage);
    }

    // 🔥 2️⃣ Guardar en archivo
    try {
        fs.appendFileSync(LOG_FILE_PATH, logMessage + '\n', 'utf8');
    } catch (err) {
        console.error(`ERROR AL ESCRIBIR EN LOGS.TXT: ${err.message}`);
    }
};

module.exports = {
    debug: (message, data) => log('DEBUG', message, data),
    info: (message, data) => log('INFO', message, data),
    error: (message, data) => log('ERROR', message, data),
    warn: (message, data) => log('WARN', message, data),
};
