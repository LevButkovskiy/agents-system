import { AIMessage } from '@langchain/core/messages';
import { END, MessagesAnnotation } from '@langchain/langgraph';

export const createShouldContinue =
  <T extends typeof MessagesAnnotation.State>(toolNode: string) =>
  (state: T): string => {
    const lastMessage = state.messages.at(-1);

    if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
      return END;
    }

    if (lastMessage.tool_calls?.length) {
      return toolNode;
    }

    return END;
  };
