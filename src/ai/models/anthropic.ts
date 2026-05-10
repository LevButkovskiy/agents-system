import { ChatAnthropic } from '@langchain/anthropic';
import { ConfigService } from '@nestjs/config';

export const createAnthropicModel = (configService: ConfigService) => {
  const apiKey = configService.getOrThrow<string>('anthropic.apiKey');

  return new ChatAnthropic({
    model: 'claude-haiku-4-5',
    temperature: 0,
    apiKey: apiKey,
  });
};

export default createAnthropicModel;
