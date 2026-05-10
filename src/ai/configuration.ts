export default () => ({
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
});
