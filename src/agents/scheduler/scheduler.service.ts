import { BaseCheckpointSaver, Command } from '@langchain/langgraph';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CHECKPOINTER } from 'src/infrastructure/infrastructure.constants';
import { AgentResult, AgentRunOptions } from 'src/shared/agent.types';
import { serializeContent } from 'src/shared/utils';
import { buildAgent } from './scheduler.graph';
import { ISchedulerService } from './scheduler.interface';
import { ToolsService } from './tools';

@Injectable()
export class SchedulerService implements ISchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
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

  async getPendingInterrupt({
    threadId,
  }: AgentRunOptions): Promise<string | undefined> {
    const config = { configurable: { thread_id: threadId } };
    const snapshot = await this.agent.getState(config);
    const rawInterrupt: unknown = snapshot?.tasks?.find(
      (t) => t.interrupts?.length > 0,
    )?.interrupts[0]?.value as unknown;

    return typeof rawInterrupt === 'string' ? rawInterrupt : undefined;
  }

  async run(
    input: string,
    { threadId, userId }: AgentRunOptions,
  ): Promise<AgentResult> {
    this.logger.log(
      `Running scheduler [thread: ${threadId}] [user: ${userId}] [${input}]`,
    );

    const config = { configurable: { thread_id: threadId } };
    const hasPendingInterrupt =
      (await this.getPendingInterrupt({ threadId, userId })) !== undefined;

    const result = hasPendingInterrupt
      ? await this.agent.invoke(new Command({ resume: input }), config)
      : await this.agent.invoke({ messages: [input], userId }, config);

    const interrupt = await this.getPendingInterrupt({ threadId, userId });

    const lastMsg = result.messages.at(-1);
    if (lastMsg) {
      this.logger.debug(
        `[${lastMsg.type}]: ${serializeContent(lastMsg.content)}`,
      );
    }

    return { messages: result.messages, interrupt };
  }
}
