import { ChatAnthropic } from '@langchain/anthropic';
import { ConfigService } from '@nestjs/config';

export const createAnthropicModel = (configService: ConfigService) => {
  const apiKey = configService.getOrThrow<string>('anthropic.apiKey');
  const baseUrl = configService.get<string>('anthropic.baseUrl');

  return new ChatAnthropic({
    model: 'claude-haiku-4-5',
    temperature: 0,
    apiKey,
    ...(baseUrl && { anthropicApiUrl: baseUrl }),
  });
};

export default createAnthropicModel;
