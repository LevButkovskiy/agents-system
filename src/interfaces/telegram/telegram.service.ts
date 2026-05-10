import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot } from 'grammy';

import { AiService } from '../../ai/ai.service';
import { serializeContent } from '../../ai/utils';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private bot: Bot;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiService: AiService,
  ) {}

  onModuleInit() {
    const token = this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    this.bot = new Bot(token);

    this.bot.on('message:text', async (ctx) => {
      const threadId = ctx.message.chat.id.toString();
      const result = await this.aiService.run(ctx.message.text, threadId);
      const lastMessage = result.messages.at(-1);
      const content = serializeContent(lastMessage?.content ?? 'No response');
      await ctx.reply(content);
    });

    void this.bot.start();
  }

  async onModuleDestroy() {
    await this.bot.stop();
  }
}
