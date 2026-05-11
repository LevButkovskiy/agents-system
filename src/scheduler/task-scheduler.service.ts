import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Task } from 'src/connectors/tasks/task.entity';
import { TasksService } from 'src/connectors/tasks/tasks.service';
import { REMINDER_NOTIFIER } from 'src/notifications/notifications.constants';
import type { ReminderNotifier } from 'src/notifications/reminder-notifier.interface';

const DUE_TASKS_BATCH_SIZE = 25;

@Injectable()
export class TaskSchedulerService {
  private readonly logger = new Logger(TaskSchedulerService.name);
  private dispatching = false;

  constructor(
    private readonly tasksService: TasksService,
    @Inject(REMINDER_NOTIFIER)
    private readonly reminderNotifier: ReminderNotifier,
  ) {}

  @Cron('* * * * *')
  async dispatchDueTasks() {
    if (this.dispatching) return;
    this.dispatching = true;

    try {
      const tasks = await this.tasksService.findDue({
        now: new Date(),
        limit: DUE_TASKS_BATCH_SIZE,
      });
      await Promise.all(tasks.map((task) => this.sendDueTask(task)));
    } catch (err) {
      this.logger.error('Failed to dispatch due tasks', err);
    } finally {
      this.dispatching = false;
    }
  }

  private async sendDueTask(task: Task) {
    try {
      await this.reminderNotifier.sendReminder({
        userId: task.userId,
        text: `Reminder: ${task.text}`,
      });
      await this.tasksService.complete({
        id: task.id,
        userId: task.userId,
      });
    } catch (err) {
      this.logger.error(`Failed to send reminder ${task.id}`, err);
    }
  }
}
