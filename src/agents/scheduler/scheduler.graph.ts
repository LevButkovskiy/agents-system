import { StructuredToolInterface } from '@langchain/core/tools';
import {
  BaseCheckpointSaver,
  END,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ConfigService } from '@nestjs/config';
import { getModel } from 'src/models';
import { createShouldContinue } from 'src/shared/graph.utils';
import { createLlmNode } from 'src/shared/nodes/llm.node';
import { SchedulerState } from './scheduler.state';

export const NODES = {
  LLM_CALL: 'llmCall',
  TOOL: 'toolNode',
} as const;

const shouldContinue = createShouldContinue<SchedulerState>(NODES.TOOL);

export const buildAgent = (
  configService: ConfigService,
  checkpointer: BaseCheckpointSaver,
  tools: StructuredToolInterface[],
  systemPrompt = 'You are a scheduler agent. Manage tasks and reminders only. ' +
    'For any relative date or time, call current_date before date arithmetic. ' +
    'When creating timed reminders, pass scheduledAt as an ISO 8601 datetime. ' +
    'Ask concise clarifying questions when the requested time is ambiguous.',
) => {
  const model = getModel(configService, tools);
  const llmNode = createLlmNode(model, systemPrompt);
  const toolNode = new ToolNode(tools);

  return new StateGraph(SchedulerState)
    .addNode(NODES.LLM_CALL, llmNode)
    .addNode(NODES.TOOL, toolNode)
    .addEdge(START, NODES.LLM_CALL)
    .addConditionalEdges(NODES.LLM_CALL, shouldContinue, [NODES.TOOL, END])
    .addEdge(NODES.TOOL, NODES.LLM_CALL)
    .compile({ checkpointer });
};
