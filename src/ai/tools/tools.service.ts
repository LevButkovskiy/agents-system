import { StructuredToolInterface } from '@langchain/core/tools';
import { Inject, Injectable } from '@nestjs/common';
import { currentDate } from '../../shared/tools/current-date';
import { GEMINI_TOOLS_TOKEN, SCHEDULER_TOOLS_TOKEN } from './tools.constants';

@Injectable()
export class ToolsService {
  private readonly tools: StructuredToolInterface[];

  constructor(
    @Inject(GEMINI_TOOLS_TOKEN) geminiTools: StructuredToolInterface[],
    @Inject(SCHEDULER_TOOLS_TOKEN) schedulerTools: StructuredToolInterface[],
  ) {
    this.tools = [currentDate, ...geminiTools, ...schedulerTools];
  }

  getTools(): StructuredToolInterface[] {
    return this.tools;
  }
}
