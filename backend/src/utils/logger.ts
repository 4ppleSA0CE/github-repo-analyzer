const isDev = process.env["NODE_ENV"] !== "production";

export const logger = {
  info: (msg: string, meta?: object): void =>
    console.log(JSON.stringify({ level: "info", msg, ...(meta ?? {}) })),
  warn: (msg: string, meta?: object): void =>
    console.warn(JSON.stringify({ level: "warn", msg, ...(meta ?? {}) })),
  error: (msg: string, meta?: object): void =>
    console.error(JSON.stringify({ level: "error", msg, ...(meta ?? {}) })),
  debug: (msg: string, meta?: object): void => {
    if (isDev) console.log(JSON.stringify({ level: "debug", msg, ...(meta ?? {}) }));
  },
};

