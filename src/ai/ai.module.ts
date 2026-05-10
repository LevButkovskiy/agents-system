import { MemorySaver } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CHECKPOINTER } from './ai.constants';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
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
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
