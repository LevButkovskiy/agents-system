import { tool } from '@langchain/core/tools';
import { getCurrentTaskInput, interrupt } from '@langchain/langgraph';
import { Task } from 'src/connectors/tasks/task.entity';
import { TasksService } from 'src/connectors/tasks/tasks.service';
import { z } from 'zod';
import { SchedulerState } from '../scheduler.state';

const getUserId = () => getCurrentTaskInput<SchedulerState>().userId;

const formatTask = (task: Task): string => {
  const parts = [`[${task.id}] ${task.text}`];
  if (task.scheduledAt)
    parts.push(`scheduled: ${task.scheduledAt.toISOString()}`);
  if (task.completedAt) parts.push('completed');
  return parts.join(' | ');
};

export const createListTasksTool = (tasksService: TasksService) =>
  tool(
    async () => {
      const tasks = await tasksService.list({ userId: getUserId() });
      if (!tasks.length) return 'No tasks found.';
      return tasks.map(formatTask).join('\n');
    },
    {
      name: 'list_tasks',
      description: 'List all active tasks and reminders for the current user.',
      schema: z.object({}),
    },
  );

export const createGetTaskTool = (tasksService: TasksService) =>
  tool(
    async ({ id }) => {
      const task = await tasksService.findOne({ id, userId: getUserId() });
      if (!task) return `Task ${id} not found.`;
      return formatTask(task);
    },
    {
      name: 'get_task',
      description: 'Get details of a specific task by its ID.',
      schema: z.object({
        id: z.number().describe('Task ID'),
      }),
    },
  );

export const createCreateTaskTool = (tasksService: TasksService) =>
  tool(
    async ({ text, scheduledAt }) => {
      const userId = getUserId();
      const scheduled = scheduledAt ? new Date(scheduledAt) : undefined;

      const confirmed = interrupt<unknown, string>(
        scheduled
          ? `Create reminder "${text}" at ${scheduled.toLocaleString()}?`
          : `Create task "${text}"?`,
      );

      if (confirmed !== 'yes') return 'Cancelled.';

      const task = await tasksService.create({
        userId,
        text,
        scheduledAt: scheduled,
      });
      return `Created: ${formatTask(task)}`;
    },
    {
      name: 'create_task',
      description:
        'Create a new task or reminder. Asks for confirmation before saving.',
      schema: z.object({
        text: z.string().describe('Task or reminder text'),
        scheduledAt: z
          .string()
          .datetime()
          .optional()
          .describe(
            'ISO 8601 datetime for a timed reminder, omit for a plain task',
          ),
      }),
    },
  );

export const createCompleteTaskTool = (tasksService: TasksService) =>
  tool(
    async ({ id }) => {
      const task = await tasksService.complete({ id, userId: getUserId() });
      if (!task) return `Task ${id} not found.`;
      return `Completed: ${formatTask(task)}`;
    },
    {
      name: 'complete_task',
      description: 'Mark a task as completed.',
      schema: z.object({
        id: z.number().describe('Task ID'),
      }),
    },
  );

export const createUpdateTaskTool = (tasksService: TasksService) =>
  tool(
    async ({ id, text, scheduledAt }) => {
      const userId = getUserId();
      const task = await tasksService.update({
        id,
        userId,
        text,
        scheduledAt:
          scheduledAt === null
            ? null
            : scheduledAt
              ? new Date(scheduledAt)
              : undefined,
      });
      if (!task) return `Task ${id} not found.`;
      return `Updated: ${formatTask(task)}`;
    },
    {
      name: 'update_task',
      description: 'Update text or scheduled time of an existing task.',
      schema: z.object({
        id: z.number().describe('Task ID'),
        text: z.string().optional().describe('New task text'),
        scheduledAt: z
          .string()
          .datetime()
          .nullable()
          .optional()
          .describe('New ISO 8601 datetime, or null to remove the schedule'),
      }),
    },
  );

export const createDeleteTaskTool = (tasksService: TasksService) =>
  tool(
    async ({ id }) => {
      const userId = getUserId();
      const task = await tasksService.findOne({ id, userId });
      if (!task) return `Task ${id} not found.`;

      const confirmed = interrupt<unknown, string>(
        `Delete task "${task.text}"?`,
      );
      if (confirmed !== 'yes') return 'Cancelled.';

      await tasksService.delete({ id, userId });
      return `Deleted task ${id}.`;
    },
    {
      name: 'delete_task',
      description: 'Delete a task. Asks for confirmation before deleting.',
      schema: z.object({
        id: z.number().describe('Task ID'),
      }),
    },
  );
