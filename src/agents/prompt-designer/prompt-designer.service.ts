import { BaseCheckpointSaver } from '@langchain/langgraph';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StructuredToolInterface } from '@langchain/core/tools';
import { CHECKPOINTER } from '../../infrastructure/infrastructure.constants';
import { AgentResult, AgentRunOptions } from '../../shared/agent.types';
import { serializeContent } from '../../shared/utils';
import { buildAgent } from './prompt-designer.graph';
import { IPromptDesignerService } from './prompt-designer.interface';
import { PROMPT_DESIGNER_AGENT_TOOLS_TOKEN } from './tools';

@Injectable()
export class PromptDesignerService implements IPromptDesignerService {
  private readonly logger = new Logger(PromptDesignerService.name);
  private readonly agent: ReturnType<typeof buildAgent>;

  constructor(
    configService: ConfigService,
    @Inject(CHECKPOINTER) checkpointer: BaseCheckpointSaver,
    @Inject(PROMPT_DESIGNER_AGENT_TOOLS_TOKEN)
    tools: StructuredToolInterface[],
  ) {
    this.agent = buildAgent(configService, checkpointer, tools);
  }

  async run(
    input: string,
    { threadId, userId }: AgentRunOptions,
  ): Promise<AgentResult> {
    this.logger.log(
      `Running prompt-designer [thread: ${threadId}] [user: ${userId}]`,
    );

    const config = { configurable: { thread_id: threadId } };
    const result = await this.agent.invoke(
      { messages: [input], userId },
      config,
    );

    const lastMsg = result.messages.at(-1);
    if (lastMsg) {
      this.logger.debug(
        `[${lastMsg.type}]: ${serializeContent(lastMsg.content)}`,
      );
    }

    return { messages: result.messages };
  }
}
