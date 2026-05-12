import { AIMessage, SystemMessage } from '@langchain/core/messages';
import { StructuredToolInterface } from '@langchain/core/tools';
import {
  BaseCheckpointSaver,
  END,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ConfigService } from '@nestjs/config';
import { getModel } from '../../models';
import { createLlmNode } from '../../shared/nodes/llm.node';
import { PROMPT_DESIGNER_SYSTEM_PROMPT } from './prompt-designer.system-prompt';
import { PromptDesignerState } from './prompt-designer.state';

export const NODES = {
  LLM_CALL: 'llmCall',
  TOOL: 'toolNode',
  REMINDER: 'reminder',
} as const;

const routeAfterLlm = (state: PromptDesignerState): string => {
  const lastMessage = state.messages.at(-1);
  if (!lastMessage || !AIMessage.isInstance(lastMessage)) return END;
  if (lastMessage.tool_calls?.length) return NODES.TOOL;
  return NODES.REMINDER;
};

const reminderNode = () => ({
  messages: [
    new SystemMessage(
      'REMINDER: You must use a tool for every response. ' +
        'You wrote plain text instead of calling a tool. ' +
        'To ask clarifying questions, call `ask_clarifying_question`. ' +
        'To submit the design, call `submit_task_design`. ' +
        'Plain text is NEVER allowed.',
    ),
  ],
  llmCalls: 0,
});

export const buildAgent = (
  configService: ConfigService,
  checkpointer: BaseCheckpointSaver,
  tools: StructuredToolInterface[],
  systemPrompt = PROMPT_DESIGNER_SYSTEM_PROMPT,
) => {
  const model = getModel(configService, tools);
  const llmNode = createLlmNode(model, systemPrompt);
  const toolNode = new ToolNode(tools);

  return new StateGraph(PromptDesignerState)
    .addNode(NODES.LLM_CALL, llmNode)
    .addNode(NODES.TOOL, toolNode)
    .addNode(NODES.REMINDER, reminderNode)
    .addEdge(START, NODES.LLM_CALL)
    .addConditionalEdges(NODES.LLM_CALL, routeAfterLlm, [
      NODES.TOOL,
      NODES.REMINDER,
      END,
    ])
    .addEdge(NODES.TOOL, END)
    .addEdge(NODES.REMINDER, NODES.LLM_CALL)
    .compile({ checkpointer });
};
