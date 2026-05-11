import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { Task } from './task.entity';
import {
  CreateTaskDto,
  FindDueTasksDto,
  ListTasksDto,
  TaskDto,
  UpdateTaskDto,
} from './tasks.types';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly repo: Repository<Task>,
  ) {}

  create(dto: CreateTaskDto): Promise<Task> {
    return this.repo.save(this.repo.create(dto));
  }

  findOne(dto: TaskDto): Promise<Task | null> {
    return this.repo.findOneBy(dto);
  }

  list(dto: ListTasksDto): Promise<Task[]> {
    return this.repo.findBy({
      userId: dto.userId,
      completedAt: IsNull(),
      deletedAt: IsNull(),
    });
  }

  findDue({ now, limit = 25 }: FindDueTasksDto): Promise<Task[]> {
    return this.repo.find({
      where: {
        scheduledAt: LessThanOrEqual(now),
        completedAt: IsNull(),
        deletedAt: IsNull(),
      },
      order: { scheduledAt: 'ASC' },
      take: limit,
    });
  }

  async complete(dto: TaskDto): Promise<Task | null> {
    await this.repo.update(dto, { completedAt: new Date() });
    return this.findOne(dto);
  }

  async update(dto: UpdateTaskDto): Promise<Task | null> {
    const { id, userId, ...fields } = dto;
    await this.repo.update({ id, userId }, fields);
    return this.findOne({ id, userId });
  }

  async delete(dto: TaskDto): Promise<void> {
    await this.repo.softDelete(dto);
  }
}
