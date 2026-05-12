import { StructuredToolInterface } from '@langchain/core/tools';
import { Module } from '@nestjs/common';
import { PromptDesignerModule } from 'src/agents/prompt-designer/prompt-designer.module';
import { PromptDesignerToolsService } from './prompt-designer-tools.service';
import { PROMPT_DESIGNER_TOOLS_TOKEN } from './tools.constants';

@Module({
  imports: [PromptDesignerModule],
  providers: [
    PromptDesignerToolsService,
    {
      provide: PROMPT_DESIGNER_TOOLS_TOKEN,
      useFactory: (
        service: PromptDesignerToolsService,
      ): StructuredToolInterface[] => service.getTools(),
      inject: [PromptDesignerToolsService],
    },
  ],
  exports: [PROMPT_DESIGNER_TOOLS_TOKEN],
})
export class PromptDesignerToolsModule {}
