import { StructuredToolInterface } from '@langchain/core/tools';
import { Module } from '@nestjs/common';
import { TasksModule } from 'src/connectors/tasks/tasks.module';
import { TasksService } from 'src/connectors/tasks/tasks.service';
import {
  createCompleteTaskTool,
  createCreateTaskTool,
  createDeleteTaskTool,
  createGetTaskTool,
  createListTasksTool,
  createUpdateTaskTool,
} from './tasks.tools';
import { TASKS_TOOLS_TOKEN } from './tools.constants';

@Module({
  imports: [TasksModule],
  providers: [
    {
      provide: TASKS_TOOLS_TOKEN,
      useFactory: (tasksService: TasksService): StructuredToolInterface[] => [
        createListTasksTool(tasksService),
        createGetTaskTool(tasksService),
        createCreateTaskTool(tasksService),
        createCompleteTaskTool(tasksService),
        createUpdateTaskTool(tasksService),
        createDeleteTaskTool(tasksService),
      ],
      inject: [TasksService],
    },
  ],
  exports: [TASKS_TOOLS_TOKEN],
})
export class TasksToolsModule {}
