import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import { BaseCheckpointSaver, Command } from '@langchain/langgraph';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { serializeContent } from '../shared/utils';
import { buildAgent } from './agent.graph';
import type {
  AiAgentResult,
  AiAgentRunOptions,
  IAgentService,
} from './agent.interface';
import { CHECKPOINTER } from './ai.constants';
import { ToolsService } from './tools';

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
    { threadId, userId, contextImages = [] }: AiAgentRunOptions,
  ): Promise<AiAgentResult> {
    this.logger.log(
      `Running agent [thread: ${threadId}] [user: ${userId}] [${typeof input === 'string' ? input : 'multimodal'}]`,
    );

    const config = { configurable: { thread_id: threadId } };
    const snapshot = await this.agent.getState(config);
    const hasPendingInterrupt = snapshot?.tasks?.some(
      (t) => t.interrupts?.length > 0,
    );

    const result = hasPendingInterrupt
      ? await this.agent.invoke(
          new Command({
            resume:
              typeof input === 'string'
                ? input
                : serializeContent(input.content),
          }),
          config,
        )
      : await this.agent.invoke(
          {
            messages: [
              typeof input === 'string' ? new HumanMessage(input) : input,
            ],
            artifacts: [],
            contextImages,
            userId,
          },
          config,
        );

    const newSnapshot = await this.agent.getState(config);
    const rawInterrupt: unknown = newSnapshot?.tasks?.find(
      (t) => t.interrupts?.length > 0,
    )?.interrupts[0]?.value as unknown;
    const interrupt =
      typeof rawInterrupt === 'string' ? rawInterrupt : undefined;

    const lastMsg = result.messages.at(-1);
    if (lastMsg) {
      this.logger.debug(
        `[${lastMsg.type}]: ${serializeContent(lastMsg.content)}`,
      );
    }

    return {
      messages: result.messages,
      artifacts: result.artifacts,
      interrupt,
    };
  }
}
