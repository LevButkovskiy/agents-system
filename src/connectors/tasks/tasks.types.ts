export interface CreateTaskDto {
  userId: string;
  text: string;
  scheduledAt?: Date;
}

export interface TaskDto {
  id: number;
  userId: string;
}

export interface ListTasksDto {
  userId: string;
}

export interface FindDueTasksDto {
  now: Date;
  limit?: number;
}

export interface UpdateTaskDto extends TaskDto {
  text?: string;
  scheduledAt?: Date | null;
}
