import { Module } from '@nestjs/common';
import { StructuredToolInterface } from '@langchain/core/tools';
import { PROMPT_DESIGNER_AGENT_TOOLS_TOKEN } from './tools.constants';
import { ToolsService } from './tools.service';

@Module({
  providers: [
    ToolsService,
    {
      provide: PROMPT_DESIGNER_AGENT_TOOLS_TOKEN,
      useFactory: (service: ToolsService): StructuredToolInterface[] =>
        service.getTools(),
      inject: [ToolsService],
    },
  ],
  exports: [PROMPT_DESIGNER_AGENT_TOOLS_TOKEN],
})
export class AgentToolsModule {}
