import { Module } from '@nestjs/common';
import { CheckpointerModule } from '../../infrastructure/checkpointer.module';
import { PROMPT_DESIGNER_SERVICE } from './prompt-designer.constants';
import { PromptDesignerService } from './prompt-designer.service';
import { AgentToolsModule } from './tools';

@Module({
  imports: [CheckpointerModule, AgentToolsModule],
  providers: [
    PromptDesignerService,
    { provide: PROMPT_DESIGNER_SERVICE, useExisting: PromptDesignerService },
  ],
  exports: [PROMPT_DESIGNER_SERVICE],
})
export class PromptDesignerModule {}
