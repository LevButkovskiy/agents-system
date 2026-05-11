import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { StructuredToolInterface } from '@langchain/core/tools';
import {
  BaseCheckpointSaver,
  ConditionalEdgeRouter,
  END,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { CHECKPOINTER } from './ai.constants';
import { getModel } from './models';
import { createLlmNode } from './nodes/llm.node';
import { createToolNode } from './nodes/tool.node';
import { AppState, ImageInput, State } from './state';
import { ToolsService } from './tools';
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

const buildAgent = (
  configService: ConfigService,
  checkpointer: BaseCheckpointSaver,
  tools: StructuredToolInterface[],
) => {
  const model = getModel(configService, tools);
  const llmNode = createLlmNode(model);
  const toolNode = createToolNode(tools);

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

  constructor(
    configService: ConfigService,
    @Inject(CHECKPOINTER) checkpointer: BaseCheckpointSaver,
    toolsService: ToolsService,
  ) {
    this.agent = buildAgent(
      configService,
      checkpointer,
      toolsService.getTools(),
    );
  }

  async onModuleInit() {
    if (process.env.NODE_ENV !== 'production') {
      await this.saveGraphDiagram();
    }
  }

  async run(
    input: string | BaseMessage,
    threadId: string,
    contextImages: ImageInput[] = [],
  ) {
    const message = typeof input === 'string' ? new HumanMessage(input) : input;
    this.logger.log(
      `Running AI [thread: ${threadId}] [${typeof input === 'string' ? input : 'multimodal'}]`,
    );

    const result = await this.agent.invoke(
      {
        messages: [message],
        artifacts: [],
        contextImages,
      },
      {
        configurable: {
          thread_id: threadId,
        },
      },
    );

    const lastMsg = result.messages.at(-1);
    if (lastMsg) {
      this.logger.debug(
        `[${lastMsg.type}]: ${serializeContent(lastMsg.content)}`,
      );
    }

    return result;
  }

  async *stream(
    input: string | BaseMessage,
    threadId: string,
    contextImages: ImageInput[] = [],
  ): AsyncGenerator<string> {
    const message = typeof input === 'string' ? new HumanMessage(input) : input;
    const events = this.agent.streamEvents(
      { messages: [message], artifacts: [], contextImages },
      { configurable: { thread_id: threadId }, version: 'v2' },
    );

    for await (const { event, data } of events) {
      if (event !== 'on_chat_model_stream') continue;
      const content = (data as { chunk?: { content?: unknown } })?.chunk
        ?.content;
      if (typeof content === 'string' && content) {
        yield content;
      } else if (Array.isArray(content)) {
        for (const block of content as { type?: string; text?: string }[]) {
          if (block?.type === 'text' && block.text) {
            yield block.text;
          }
        }
      }
    }
  }

  async saveGraphDiagram(filename = 'blob.png') {
    const dir = join('logs', 'graphs');
    await mkdir(dir, { recursive: true });

    const graph = await this.agent.getGraphAsync();
    const blob = await graph.drawMermaidPng();
    const buffer = Buffer.from(await blob.arrayBuffer());

    await writeFile(join(dir, filename), buffer);
  }
}
