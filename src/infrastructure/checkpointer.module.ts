import { MemorySaver } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CHECKPOINTER } from './infrastructure.constants';

@Module({
  providers: [
    {
      provide: CHECKPOINTER,
      useFactory: async (configService: ConfigService) => {
        if (configService.get<string>('NODE_ENV') === 'production') {
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
  ],
  exports: [CHECKPOINTER],
})
export class CheckpointerModule {}
