const { createLogger, format, transports } = require("winston");

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, ...meta }) => {
      let msg = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

      if (Object.keys(meta).length > 0) {
        msg += ` | ${JSON.stringify(meta)}`;
      }

      return msg;
    })
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "logs/error.log", level: "error" }),
    new transports.File({ filename: "logs/combined.log" })
  ]
});

module.exports = logger;