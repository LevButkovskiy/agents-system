import { Module } from '@nestjs/common';
import { AiModule } from '../../ai/ai.module';
import { REMINDER_NOTIFIER } from '../../notifications/notifications.constants';
import { TelegramService } from './telegram.service';

@Module({
  imports: [AiModule],
  providers: [
    TelegramService,
    { provide: REMINDER_NOTIFIER, useExisting: TelegramService },
  ],
  exports: [REMINDER_NOTIFIER],
})
export class TelegramModule {}
