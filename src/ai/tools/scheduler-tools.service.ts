import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { getCurrentTaskInput, interrupt } from '@langchain/langgraph';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { SCHEDULER_SERVICE } from 'src/agents/scheduler/scheduler.constants';
import type { ISchedulerService } from 'src/agents/scheduler/scheduler.interface';
import { serializeContent } from 'src/shared/utils';
import type { AppState } from '../ai.state';

@Injectable()
export class SchedulerToolsService {
  constructor(
    @Inject(SCHEDULER_SERVICE)
    private readonly schedulerService: ISchedulerService,
  ) {}

  getTools(): StructuredToolInterface[] {
    return [
      tool(
        async ({ request }) => {
          const { userId } = getCurrentTaskInput<AppState>();
          const threadId = `scheduler:${userId}`;

          const pendingInterrupt =
            await this.schedulerService.getPendingInterrupt({
              threadId,
              userId,
            });

          if (pendingInterrupt) {
            const answer = interrupt<unknown, string>(pendingInterrupt);
            const final = await this.schedulerService.run(answer, {
              threadId,
              userId,
            });
            return serializeContent(final.messages.at(-1)?.content ?? 'Done.');
          }

          const result = await this.schedulerService.run(request, {
            threadId,
            userId,
          });

          if (result.interrupt) {
            const answer = interrupt<unknown, string>(result.interrupt);
            const final = await this.schedulerService.run(answer, {
              threadId,
              userId,
            });
            return serializeContent(final.messages.at(-1)?.content ?? 'Done.');
          }

          return serializeContent(result.messages.at(-1)?.content ?? 'Done.');
        },
        {
          name: 'scheduler',
          description:
            'Delegate task and reminder management to the scheduler agent. Use for: creating tasks/reminders, listing tasks, updating, completing, or deleting tasks.',
          schema: z.object({
            request: z
              .string()
              .describe("The user's request in natural language"),
          }),
        },
      ),
    ];
  }
}
