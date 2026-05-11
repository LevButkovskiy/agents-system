import { Module } from '@nestjs/common';
import { AiModule } from '../../ai/ai.module';
import { ConversationsModule } from '../../conversations/conversations.module';
import { REMINDER_NOTIFIER } from '../../notifications/notifications.constants';
import { UsersModule } from '../../users/users.module';
import { TelegramService } from './telegram.service';

@Module({
  imports: [AiModule, UsersModule, ConversationsModule],
  providers: [
    TelegramService,
    { provide: REMINDER_NOTIFIER, useExisting: TelegramService },
  ],
  exports: [REMINDER_NOTIFIER],
})
export class TelegramModule {}
