import { ChatAnthropic } from '@langchain/anthropic';
import { StructuredToolInterface } from '@langchain/core/tools';
import { ConfigService } from '@nestjs/config';
import createAnthropicModel from './anthropic';

type ModelVariations = ChatAnthropic;

type Model<T extends ModelVariations> = (configService: ConfigService) => T;

type Models = { anthropic: Model<ChatAnthropic> };

const models: Models = {
  anthropic: createAnthropicModel,
};

const getModel = (
  configService: ConfigService,
  tools?: StructuredToolInterface[],
) => {
  const configModel = configService.get<string>('model');
  const modelName = (configModel ?? 'anthropic') as keyof Models;

  const modelFn = models[modelName];
  if (!modelFn) throw new Error(`invalid model name ${modelName}`);

  const model = modelFn(configService);

  if (tools?.length) {
    return model.bindTools(tools);
  }
  return model;
};

export { getModel, models };
