import { StructuredToolInterface } from '@langchain/core/tools';
import { Inject, Injectable } from '@nestjs/common';
import { currentDate } from '../../../shared/tools/current-date';
import { TASKS_TOOLS_TOKEN } from './tools.constants';

@Injectable()
export class ToolsService {
  constructor(
    @Inject(TASKS_TOOLS_TOKEN)
    private readonly tasks: StructuredToolInterface[],
  ) {}

  getTools(): StructuredToolInterface[] {
    return [currentDate, ...this.tasks];
  }
}
