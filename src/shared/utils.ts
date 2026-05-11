export const serializeContent = (content: unknown): string =>
  typeof content === 'string' ? content : JSON.stringify(content);
