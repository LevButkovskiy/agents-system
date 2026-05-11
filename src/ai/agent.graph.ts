import { AIMessage } from '@langchain/core/messages';
import { StructuredToolInterface } from '@langchain/core/tools';
import {
  BaseCheckpointSaver,
  ConditionalEdgeRouter,
  END,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { ConfigService } from '@nestjs/config';
import { getModel } from './models';
import { createLlmNode } from './nodes/llm.node';
import { createToolNode } from './nodes/tool.node';
import { AppState, State } from './state';

export const NODES = {
  LLM_CALL: 'llmCall',
  TOOL: 'toolNode',
} as const;

const shouldContinue: ConditionalEdgeRouter<AppState> = (state) => {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return END;
  }

  if (lastMessage.tool_calls?.length) {
    return NODES.TOOL;
  }

  return END;
};

export const buildAgent = (
  configService: ConfigService,
  checkpointer: BaseCheckpointSaver,
  tools: StructuredToolInterface[],
  systemPrompt = 'You are a helpful personal assistant',
) => {
  const model = getModel(configService, tools);
  const llmNode = createLlmNode(model, systemPrompt);
  const toolNode = createToolNode(tools);

  return new StateGraph(State)
    .addNode(NODES.LLM_CALL, llmNode)
    .addNode(NODES.TOOL, toolNode)
    .addEdge(START, NODES.LLM_CALL)
    .addConditionalEdges(NODES.LLM_CALL, shouldContinue, [NODES.TOOL, END])
    .addEdge(NODES.TOOL, NODES.LLM_CALL)
    .compile({ checkpointer });
};
