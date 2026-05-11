export default () => ({
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  gemini: {
    apiKey: process.env.PROXYAPI_KEY,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  telegram: {
    streaming: process.env.TELEGRAM_STREAMING === 'true',
  },
});
