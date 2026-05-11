import { Module } from '@nestjs/common';
import { TelegramModule } from 'src/interfaces/telegram/telegram.module';

@Module({
  imports: [TelegramModule],
  exports: [TelegramModule],
})
export class NotificationsModule {}
