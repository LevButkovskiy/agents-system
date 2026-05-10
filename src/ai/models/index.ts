import { ChatAnthropic } from '@langchain/anthropic';
import { ConfigService } from '@nestjs/config';
import { tools } from '../tools';
import createAnthropicModel from './anthropic';

type ModelVariations = ChatAnthropic;

type Model<T extends ModelVariations> = (configService: ConfigService) => T;

type Models = { anthropic: Model<ChatAnthropic> };

const models: Models = {
  anthropic: createAnthropicModel,
};

const getModel = (
  configService: ConfigService,
  options?: { tools?: boolean },
) => {
  const configModel = configService.get<string>('model');
  const modelName = (configModel ?? 'anthropic') as keyof Models;

  const modelFn = models[modelName];
  if (!modelFn) throw new Error(`invalid model name ${modelName}`);

  const model = modelFn(configService);

  if (options?.tools) {
    return model.bindTools(tools);
  }
  return model;
};

export { getModel, models };
