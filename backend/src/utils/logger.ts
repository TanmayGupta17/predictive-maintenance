type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function write(level: LogLevel, message: unknown) {
  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  console[level](`[${level.toUpperCase()}] ${payload}`);
}

export const logger = {
  debug: (message: unknown) => write('debug', message),
  info: (message: unknown) => write('info', message),
  warn: (message: unknown) => write('warn', message),
  error: (message: unknown) => write('error', message),
};
