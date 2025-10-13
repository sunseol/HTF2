import fs from "fs";
import path from "path";
import winston from "winston";

const { combine, timestamp, colorize, printf, errors, json } = winston.format;

const LOG_DIR = path.resolve(process.cwd(), "logs");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const consoleFormatter = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  const stackMessage = stack ? `\n${stack}` : "";
  return `${ts} [${level}] ${message}${metaString}${stackMessage}`;
});

const consoleTransport = new winston.transports.Console({
  format: combine(colorize(), timestamp(), errors({ stack: true }), consoleFormatter),
});

const fileTransport = new winston.transports.File({
  filename: path.join(LOG_DIR, "server.log"),
  level: process.env.LOG_FILE_LEVEL || process.env.LOG_LEVEL || "info",
  format: combine(timestamp(), errors({ stack: true }), json()),
  maxsize: 5 * 1024 * 1024,
  maxFiles: 5,
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  transports: [consoleTransport, fileTransport],
});

export const createChildLogger = (scope: string) => logger.child({ scope });
