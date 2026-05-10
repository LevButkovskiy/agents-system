import { BaseMessage, SystemMessage } from '@langchain/core/messages';
import { Runnable } from '@langchain/core/runnables';
import { AppState } from '../state';

export const createLlmNode = (model: Runnable<BaseMessage[], BaseMessage>) => {
  return async (state: AppState) => {
    const response = await model.invoke([
      new SystemMessage('You are a helpful personal assistant'),
      ...state.messages,
    ]);

    return {
      messages: [response],
      llmCalls: 1,
    };
  };
};
