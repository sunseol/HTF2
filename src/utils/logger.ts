import winston from 'winston';

const { combine, timestamp, colorize, printf, errors } = winston.format;

const logFormatter = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  const stackMessage = stack ? `\n${stack}` : '';
  return `${ts} [${level}] ${message}${metaString}${stackMessage}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    colorize(),
    timestamp(),
    errors({ stack: true }),
    logFormatter,
  ),
  transports: [new winston.transports.Console()],
});

export const createChildLogger = (scope: string) => logger.child({ scope });
