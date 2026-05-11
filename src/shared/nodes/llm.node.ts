import { BaseMessage, SystemMessage } from '@langchain/core/messages';
import { Runnable } from '@langchain/core/runnables';
import { MessagesAnnotation } from '@langchain/langgraph';

export const createLlmNode = <T extends typeof MessagesAnnotation.State>(
  model: Runnable<BaseMessage[], BaseMessage>,
  systemPrompt: string,
) => {
  return async (state: T) => {
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
