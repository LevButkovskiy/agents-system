import { Module } from '@nestjs/common';
import { CheckpointerModule } from '../infrastructure/checkpointer.module';
import { AGENT_SERVICE } from './ai.constants';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ToolsService } from './tools';
import { GeminiToolsModule } from './tools/gemini-tools.module';
import { SchedulerToolsModule } from './tools/scheduler-tools.module';

@Module({
  imports: [CheckpointerModule, GeminiToolsModule, SchedulerToolsModule],
  controllers: [AiController],
  providers: [
    ToolsService,
    AiService,
    { provide: AGENT_SERVICE, useExisting: AiService },
  ],
  exports: [AGENT_SERVICE],
})
export class AiModule {}
