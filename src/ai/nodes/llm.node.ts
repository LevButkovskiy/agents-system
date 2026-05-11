import { BaseMessage, SystemMessage } from '@langchain/core/messages';
import { Runnable } from '@langchain/core/runnables';
import { AppState } from '../state';

export const createLlmNode = (
  model: Runnable<BaseMessage[], BaseMessage>,
  systemPrompt: string,
) => {
  return async (state: AppState) => {
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      ...state.messages,
    ]);

    return {
      messages: [response],
      llmCalls: 1,
    };
  };
};
