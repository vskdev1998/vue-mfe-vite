/**
 * API gateway settings for THIS app (each app has its own copy and its own key).
 * Values come from .env.[mode] → import.meta.env at build time.
 */
export const GATEWAY_HEADER = import.meta.env.VITE_API_GATEWAY_HEADER || 'x-api-gateway-key'
export const GATEWAY_KEY = import.meta.env.VITE_API_GATEWAY_KEY || ''

/** Masked for logs/UI: gw_host_dev_f2d2…3e29 */
export const maskKey = (key = GATEWAY_KEY) =>
  key.length > 12 ? `${key.slice(0, key.length - 12)}…${key.slice(-4)}` : '(missing)'
