import { StructuredToolInterface } from '@langchain/core/tools';
import { Module } from '@nestjs/common';
import { GeminiModule } from '../../connectors/gemini/gemini.module';
import { GeminiService } from '../../connectors/gemini/gemini.service';
import { createImageEditorTool } from './image-editor';
import { createImageGeneratorTool } from './image-generator';
import { GEMINI_TOOLS_TOKEN } from './tools.constants';

@Module({
  imports: [GeminiModule],
  providers: [
    {
      provide: GEMINI_TOOLS_TOKEN,
      useFactory: (geminiService: GeminiService): StructuredToolInterface[] => [
        createImageGeneratorTool(geminiService),
        createImageEditorTool(geminiService),
      ],
      inject: [GeminiService],
    },
  ],
  exports: [GEMINI_TOOLS_TOKEN],
})
export class GeminiToolsModule {}
