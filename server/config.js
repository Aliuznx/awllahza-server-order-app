export const config = {
  host: process.env.HOST || '127.0.0.1',
  port: Number(process.env.PORT || 3000),
  origin: process.env.APP_ORIGIN || 'http://127.0.0.1:3000',
  production: process.env.NODE_ENV === 'production',
  orderingEnabled: process.env.ORDERING_ENABLED === 'true',
  testMode: process.env.TEST_MODE === 'true',
};
if (config.production && (!config.origin.startsWith('https://') || config.testMode)) {
  throw new Error('Production requires an HTTPS APP_ORIGIN and TEST_MODE=false.');
}
