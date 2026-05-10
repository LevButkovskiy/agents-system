import { AIMessage, ToolMessage } from 'langchain';
import { AppState } from '../state';
import { toolsByName } from '../tools';

export const createToolNode = () => {
  return async (state: AppState) => {
    const lastMessage = state.messages.at(-1);

    if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
      return { messages: [] };
    }

    const result: ToolMessage[] = [];
    for (const toolCall of lastMessage.tool_calls ?? []) {
      const toolName = toolCall.name as keyof typeof toolsByName;
      const tool = toolsByName[toolName];
      const observation = await tool.invoke(toolCall);
      result.push(observation);
    }

    return { messages: result };
  };
};
