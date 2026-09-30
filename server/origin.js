// Permit only the configured origin, plus equivalent loopback names in local mode.
export function isAllowedOrigin(origin, config) {
  if (origin === config.origin) return true;
  if (config.production || typeof origin !== 'string') return false;
  try {
    const given = new URL(origin), configured = new URL(config.origin);
    const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
    return given.origin === origin && loopback.has(given.hostname) && loopback.has(configured.hostname)
      && given.protocol === configured.protocol && given.port === configured.port;
  } catch { return false; }
}
