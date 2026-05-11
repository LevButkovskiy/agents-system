import { StructuredToolInterface } from '@langchain/core/tools';
import { Inject, Injectable } from '@nestjs/common';
import { currentDate } from './current-date';
import { GEMINI_TOOLS_TOKEN } from './tools.constants';

@Injectable()
export class ToolsService {
  private readonly tools: StructuredToolInterface[];

  constructor(
    @Inject(GEMINI_TOOLS_TOKEN) geminiTools: StructuredToolInterface[],
  ) {
    this.tools = [currentDate, ...geminiTools];
  }

  getTools(): StructuredToolInterface[] {
    return this.tools;
  }
}
