import { Module } from '@nestjs/common';
import { CheckpointerModule } from 'src/infrastructure/checkpointer.module';
import { SCHEDULER_SERVICE } from './scheduler.constants';
import { SchedulerService } from './scheduler.service';
import { ToolsService } from './tools';
import { TasksToolsModule } from './tools/tasks-tools.module';

@Module({
  imports: [CheckpointerModule, TasksToolsModule],
  providers: [
    ToolsService,
    SchedulerService,
    { provide: SCHEDULER_SERVICE, useExisting: SchedulerService },
  ],
  exports: [SCHEDULER_SERVICE],
})
export class SchedulerModule {}
