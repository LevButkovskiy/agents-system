export default () => ({
  NODE_ENV: process.env.NODE_ENV ?? 'development',
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
    botToken: process.env.TELEGRAM_BOT_TOKEN,
  },
  model: process.env.MODEL ?? 'anthropic',
});
