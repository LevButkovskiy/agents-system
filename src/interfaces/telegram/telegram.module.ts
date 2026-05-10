import { Module } from '@nestjs/common';
import { AiModule } from '../../ai/ai.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [AiModule],
  controllers: [TelegramController],
  providers: [TelegramService],
})
export class TelegramModule {}
