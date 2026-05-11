import { StructuredToolInterface } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { GeminiService } from '../../connectors/gemini/gemini.service';
import { currentDate } from './current-date';
import { createImageEditorTool } from './image-editor';
import { createImageGeneratorTool } from './image-generator';

@Injectable()
export class ToolsService {
  private readonly tools: StructuredToolInterface[];

  constructor(geminiService: GeminiService) {
    this.tools = [
      currentDate,
      createImageGeneratorTool(geminiService),
      createImageEditorTool(geminiService),
    ];
  }

  getTools(): StructuredToolInterface[] {
    return this.tools;
  }
}
