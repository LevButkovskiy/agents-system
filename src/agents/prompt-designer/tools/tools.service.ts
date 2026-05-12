import { Injectable } from '@nestjs/common';
import { StructuredToolInterface } from '@langchain/core/tools';
import {
  askClarifyingQuestionTool,
  submitTaskDesignTool,
} from '../prompt-designer.tools';

@Injectable()
export class ToolsService {
  private readonly tools: StructuredToolInterface[] = [
    askClarifyingQuestionTool,
    submitTaskDesignTool,
  ];

  getTools(): StructuredToolInterface[] {
    return this.tools;
  }
}
