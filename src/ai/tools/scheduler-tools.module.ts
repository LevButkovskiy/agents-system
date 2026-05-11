import { StructuredToolInterface } from '@langchain/core/tools';
import { Module } from '@nestjs/common';
import { SchedulerModule } from 'src/agents/scheduler/scheduler.module';
import { SCHEDULER_TOOLS_TOKEN } from './tools.constants';
import { SchedulerToolsService } from './scheduler-tools.service';

@Module({
  imports: [SchedulerModule],
  providers: [
    SchedulerToolsService,
    {
      provide: SCHEDULER_TOOLS_TOKEN,
      useFactory: (service: SchedulerToolsService): StructuredToolInterface[] =>
        service.getTools(),
      inject: [SchedulerToolsService],
    },
  ],
  exports: [SCHEDULER_TOOLS_TOKEN],
})
export class SchedulerToolsModule {}
