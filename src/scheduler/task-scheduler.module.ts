import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TasksModule } from 'src/connectors/tasks/tasks.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { TaskSchedulerService } from './task-scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), TasksModule, NotificationsModule],
  providers: [TaskSchedulerService],
})
export class TaskSchedulerModule {}
