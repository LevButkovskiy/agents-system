import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { BaseCheckpointSaver } from '@langchain/langgraph';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CHECKPOINTER } from './ai.constants';
import type { AgentResult, IAgentService } from './agent.interface';
import { buildAgent } from './agent.graph';
import { ImageInput } from './state';
import { ToolsService } from './tools';
import { serializeContent } from '../shared/utils';

@Injectable()
export class AiService implements IAgentService {
  private readonly logger = new Logger(AiService.name);
  private readonly agent: ReturnType<typeof buildAgent>;

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

  async run(
    input: string | BaseMessage,
    threadId: string,
    contextImages: ImageInput[] = [],
  ): Promise<AgentResult> {
    const message = typeof input === 'string' ? new HumanMessage(input) : input;
    this.logger.log(
      `Running agent [thread: ${threadId}] [${typeof input === 'string' ? input : 'multimodal'}]`,
    );

    const result = await this.agent.invoke(
      {
        messages: [message],
        artifacts: [],
        contextImages,
      },
      {
        configurable: { thread_id: threadId },
      },
    );

    const lastMsg = result.messages.at(-1);
    if (lastMsg) {
      this.logger.debug(
        `[${lastMsg.type}]: ${serializeContent(lastMsg.content)}`,
      );
    }

    return {
      messages: result.messages,
      artifacts: result.artifacts,
    };
  }
}
