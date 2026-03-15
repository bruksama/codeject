export const logger = {
  error(message: string, meta?: unknown) {
    console.error(`[codeject] ${message}`, meta ?? '');
  },
  info(message: string, meta?: unknown) {
    console.info(`[codeject] ${message}`, meta ?? '');
  },
  warn(message: string, meta?: unknown) {
    console.warn(`[codeject] ${message}`, meta ?? '');
  },
};

