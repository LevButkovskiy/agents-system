import { MemorySaver } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiModule } from '../connectors/gemini/gemini.module';
import { CHECKPOINTER } from './ai.constants';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ToolsService } from './tools';

@Module({
  imports: [GeminiModule],
  controllers: [AiController],
  providers: [
    {
      provide: CHECKPOINTER,
      useFactory: async (configService: ConfigService) => {
        if (process.env.NODE_ENV === 'production') {
          const saver = PostgresSaver.fromConnString(
            configService.getOrThrow<string>('database.url'),
          );
          await saver.setup();
          return saver;
        }
        return new MemorySaver();
      },
      inject: [ConfigService],
    },
    ToolsService,
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
