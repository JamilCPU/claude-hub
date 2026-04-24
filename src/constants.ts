export const HUB_PORT = parseInt(process.env.HUB_PORT ?? "7900", 10);
export const HUB_HOST = process.env.HUB_HOST ?? "localhost";
export const HUB_BASE_URL = `http://${HUB_HOST}:${HUB_PORT}`;
export const HUB_TIMEOUT_MS = parseInt(
  process.env.HUB_TIMEOUT_MS ?? "300000",
  10
); // 5 minutes
export const MAX_RESOLVED_HISTORY = 50;
