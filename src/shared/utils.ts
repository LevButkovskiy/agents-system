export const serializeContent = (content: unknown): string =>
  typeof content === 'string' ? content : JSON.stringify(content);

const ESC_MDV2 = (s: string) => s.replace(/[_*[\]()~`>#+=\-|{}.!\\]/g, '\\$&');

export function toTelegramMarkdownV2(text: string): string {
  const result: string[] = [];
  const pattern = /(\*\*(?:.+?)\*\*|\*(?:.+?)\*|`(?:[^`]+)`)/gs;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(ESC_MDV2(text.slice(lastIndex, match.index)));
    }

    const token = match[0];
    if (token.startsWith('**')) {
      result.push(`*${ESC_MDV2(token.slice(2, -2))}*`);
    } else if (token.startsWith('*')) {
      result.push(`_${ESC_MDV2(token.slice(1, -1))}_`);
    } else {
      result.push(`\`${token.slice(1, -1).replace(/[`\\]/g, '\\$&')}\``);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    result.push(ESC_MDV2(text.slice(lastIndex)));
  }

  return result.join('');
}
