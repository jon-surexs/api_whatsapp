// src/utils/logger.js

const fs = require('fs');
const path = require('path');

// Define la ruta absoluta al archivo de logs (sube dos niveles desde 'src/utils')
const LOG_FILE_PATH = path.join(__dirname, '../../logs.txt');

/**
 * Escribe un mensaje de log de forma síncrona al archivo logs.txt.
 * Esto asegura que los logs se escriban inmediatamente para depuración.
 * @param {string} level - Nivel del log (DEBUG, INFO, ERROR, WARN).
 * @param {string} message - El mensaje a loguear.
 * @param {any} [data] - Datos adicionales para loguear (opcional).
 */
const log = (level, message, data) => {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;

    if (data !== undefined) { // Asegura que 'undefined' no se convierta en "null" o "undefined" string
        logMessage += ` - Data: ${JSON.stringify(data, null, 2)}`;
    }

    try {
        fs.appendFileSync(LOG_FILE_PATH, logMessage + '\n', 'utf8');
    } catch (err) {
        // Fallback: si no podemos escribir en el archivo, lo mostramos en la consola
        console.error(`ERROR AL ESCRIBIR EN LOGS.TXT: ${err.message}`);
        console.error(`Mensaje que no se pudo loguear: ${logMessage}`);
    }
};

module.exports = {
    debug: (message, data) => log('DEBUG', message, data),
    info: (message, data) => log('INFO', message, data),
    error: (message, data) => log('ERROR', message, data),
    warn: (message, data) => log('WARN', message, data),
};