import { AIMessage, HumanMessage } from '@langchain/core/messages';
import {
  ConditionalEdgeRouter,
  END,
  MemorySaver,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { getModel } from './models';
import { createLlmNode } from './nodes/llm.node';
import { createToolNode } from './nodes/tool.node';
import { AppState, State } from './state';
import { serializeContent } from './utils';

const NODES = {
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

const buildAgent = (configService: ConfigService) => {
  const model = getModel(configService, { tools: true });
  const llmNode = createLlmNode(model);
  const toolNode = createToolNode();
  const checkpointer = new MemorySaver();

  return new StateGraph(State)
    .addNode(NODES.LLM_CALL, llmNode)
    .addNode(NODES.TOOL, toolNode)
    .addEdge(START, NODES.LLM_CALL)
    .addConditionalEdges(NODES.LLM_CALL, shouldContinue, [NODES.TOOL, END])
    .addEdge(NODES.TOOL, NODES.LLM_CALL)
    .compile({ checkpointer });
};

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger('AiService');
  private agent: ReturnType<typeof buildAgent>;

  constructor(configService: ConfigService) {
    this.agent = buildAgent(configService);
  }

  async onModuleInit() {
    await this.saveGraphDiagram();
  }

  async run(input: string, threadId: string) {
    this.logger.log(`Running AI with input: ${input} [thread: ${threadId}]`);

    const result = await this.agent.invoke(
      {
        messages: [new HumanMessage(input)],
      },
      {
        configurable: {
          thread_id: threadId,
        },
      },
    );

    for (const message of result.messages) {
      this.logger.debug(
        `[${message.type}]: ${serializeContent(message.content)}`,
      );
    }

    return result;
  }

  async saveGraphDiagram(filename = 'blob.png') {
    const dir = join('logs', 'graphs');
    await mkdir(dir, { recursive: true });

    const graph = await this.agent.getGraphAsync();
    this.logger.debug(graph.toJSON());
    const blob = await graph.drawMermaidPng();
    const buffer = Buffer.from(await blob.arrayBuffer());

    await writeFile(join(dir, filename), buffer);
  }
}
