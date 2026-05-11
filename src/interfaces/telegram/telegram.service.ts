import { HumanMessage } from '@langchain/core/messages';
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Context, InlineKeyboard, InputFile } from 'grammy';

import type { AiAgentResult, IAgentService } from '../../ai/agent.interface';
import { AGENT_SERVICE } from '../../ai/ai.constants';
import { ImageArtifact } from '../../ai/ai.state';
import { ConversationsService } from '../../conversations/conversations.service';
import type {
  ReminderNotifier,
  SendReminderDto,
} from '../../notifications/reminder-notifier.interface';
import { serializeContent, toTelegramMarkdownV2 } from '../../shared/utils';
import {
  UserIdentity,
  UserIdentityProvider,
} from '../../users/user-identity.entity';
import { UsersService } from '../../users/users.service';

const ALBUM_FLUSH_MS = 1500;

interface PhotoData {
  base64: string;
  mimeType: string;
}

interface AlbumBuffer {
  photos: Promise<PhotoData>[];
  caption?: string;
  ctx: Context;
  timer?: ReturnType<typeof setTimeout>;
}

@Injectable()
export class TelegramService
  implements OnModuleInit, OnModuleDestroy, ReminderNotifier
{
  private readonly logger = new Logger(TelegramService.name);
  private bot: Bot<Context>;
  private readonly albumBuffers = new Map<string, AlbumBuffer>();

  constructor(
    private readonly configService: ConfigService,
    @Inject(AGENT_SERVICE) private readonly agentService: IAgentService,
    private readonly usersService: UsersService,
    private readonly conversationsService: ConversationsService,
  ) {}

  onModuleInit() {
    const token = this.configService.getOrThrow<string>('telegram.botToken');
    this.bot = new Bot<Context>(token);
    void this.bot.api.setMyCommands([
      { command: 'start', description: 'Start the assistant' },
      { command: 'help', description: 'Show available commands' },
      { command: 'reset', description: 'Reset the current chat session' },
    ]);

    this.bot.on('message:text', async (ctx) => {
      try {
        await this.handleTextMessage(ctx);
      } catch (err) {
        this.logger.error('Failed to handle text message', err);
        await ctx
          .reply('Something went wrong. Please try again')
          .catch(() => null);
      }
    });

    this.bot.on('message:photo', async (ctx) => {
      try {
        await this.handlePhotoMessage(ctx);
      } catch (err) {
        this.logger.error('Failed to handle photo message', err);
        await ctx
          .reply('Something went wrong processing the image. Please try again')
          .catch(() => null);
      }
    });

    this.bot.on('callback_query:data', async (ctx) => {
      try {
        await this.handleCallbackQuery(ctx);
      } catch (err) {
        this.logger.error('Failed to handle callback query', err);
      }
    });

    void this.bot.start();
  }

  async onModuleDestroy() {
    for (const buffer of this.albumBuffers.values()) {
      clearTimeout(buffer.timer);
    }
    this.albumBuffers.clear();
    await this.bot.stop();
  }

  async sendReminder({ userId, text }: SendReminderDto): Promise<void> {
    const identity = await this.usersService.findIdentity({
      userId,
      provider: UserIdentityProvider.Telegram,
    });
    const chatId = identity?.providerChatId ?? identity?.providerUserId;

    if (!chatId) {
      throw new Error(`Telegram identity not found for user ${userId}`);
    }

    await this.bot.api.sendMessage(chatId, toTelegramMarkdownV2(text), {
      parse_mode: 'MarkdownV2',
    });
  }

  private async handleTextMessage(ctx: Context) {
    const text = ctx.message!.text!;
    if (await this.handleCommand(ctx, text)) return;

    const options = await this.getRunOptions(ctx);
    await this.sendResult(ctx, await this.agentService.run(text, options));
  }

  private async handleCommand(ctx: Context, text: string): Promise<boolean> {
    const command = text.split(/\s+/, 1)[0].toLowerCase();

    if (command === '/start' || command === '/help') {
      await ctx.reply(
        [
          'Available commands:',
          '/reset - reset the current chat session without changing long-term memory',
        ].join('\n'),
      );
      return true;
    }

    if (command !== '/reset') return false;

    const providerChatId = ctx.chat!.id.toString();
    const identity = await this.resolveTelegramIdentity(ctx);

    await this.conversationsService.resetActiveSession({
      userId: identity.userId,
      provider: UserIdentityProvider.Telegram,
      providerChatId,
    });

    await ctx.reply('Session reset. Long-term memory was not changed.');
    return true;
  }

  private async handlePhotoMessage(ctx: Context) {
    const photo = ctx.message!.photo!.at(-1)!;
    const caption = ctx.message!.caption;
    const mediaGroupId = ctx.message!.media_group_id;
    const photoData = this.fetchPhotoData(photo.file_id);

    if (!mediaGroupId) {
      await this.processPhotos(ctx, [await photoData], caption);
      return;
    }

    this.bufferAlbumPhoto(mediaGroupId, photoData, caption, ctx);
  }

  private async handleCallbackQuery(ctx: Context) {
    const data = ctx.callbackQuery!.data!;
    const options = await this.getRunOptions(ctx);

    await ctx.answerCallbackQuery();
    await ctx.deleteMessage();

    await this.sendResult(ctx, await this.agentService.run(data, options));
  }

  private bufferAlbumPhoto(
    mediaGroupId: string,
    photo: Promise<PhotoData>,
    caption: string | undefined,
    ctx: Context,
  ) {
    let buffer = this.albumBuffers.get(mediaGroupId);
    clearTimeout(buffer?.timer);

    if (!buffer) {
      buffer = { photos: [], ctx };
      this.albumBuffers.set(mediaGroupId, buffer);
    }

    buffer.photos.push(photo);
    if (caption && !buffer.caption) buffer.caption = caption;
    buffer.timer = this.scheduleFlush(mediaGroupId);
  }

  private scheduleFlush(mediaGroupId: string): ReturnType<typeof setTimeout> {
    return setTimeout(() => void this.flushAlbum(mediaGroupId), ALBUM_FLUSH_MS);
  }

  private async flushAlbum(mediaGroupId: string) {
    const buffer = this.albumBuffers.get(mediaGroupId);
    if (!buffer) return;
    this.albumBuffers.delete(mediaGroupId);

    try {
      const photos = await this.settlePhotos(mediaGroupId, buffer.photos);
      if (photos.length === 0) throw new Error('All photos failed to download');
      await this.processPhotos(buffer.ctx, photos, buffer.caption);
    } catch (err) {
      this.logger.error(`Failed to process album ${mediaGroupId}`, err);
      await buffer.ctx
        .reply('Something went wrong processing the album. Please try again')
        .catch(() => null);
    }
  }

  private async settlePhotos(
    mediaGroupId: string,
    pending: Promise<PhotoData>[],
  ): Promise<PhotoData[]> {
    const results = await Promise.allSettled(pending);
    const photos = results
      .filter(
        (r): r is PromiseFulfilledResult<PhotoData> => r.status === 'fulfilled',
      )
      .map((r) => r.value);
    const failed = results.length - photos.length;
    if (failed > 0) {
      this.logger.warn(
        `Album ${mediaGroupId}: ${failed}/${results.length} photos failed to download`,
      );
    }
    return photos;
  }

  private async processPhotos(
    ctx: Context,
    photos: PhotoData[],
    caption: string | undefined,
  ) {
    const options = await this.getRunOptions(ctx);
    const contextImages = photos.map((p) => ({
      data: p.base64,
      mimeType: p.mimeType,
    }));
    const message = new HumanMessage({
      content: [
        ...(caption ? [{ type: 'text' as const, text: caption }] : []),
        ...contextImages.map((img) => ({ type: 'image' as const, ...img })),
      ],
    });

    await this.sendResult(
      ctx,
      await this.agentService.run(message, { ...options, contextImages }),
    );
  }

  private async fetchPhotoData(fileId: string): Promise<PhotoData> {
    const file = await this.bot.api.getFile(fileId);
    const url = `https://api.telegram.org/file/bot${this.bot.token}/${file.file_path!}`;
    const response = await fetch(url);
    const raw = response.headers.get('content-type') ?? '';
    const mimeType = this.normalizeImageMimeType(raw);
    const base64 = Buffer.from(await response.arrayBuffer()).toString('base64');
    return { base64, mimeType };
  }

  private normalizeImageMimeType(
    raw: string,
  ): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
    const base = raw.split(';')[0].trim().toLowerCase();
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ] as const;
    if ((allowed as readonly string[]).includes(base)) {
      return base as (typeof allowed)[number];
    }
    return 'image/jpeg';
  }

  private async sendResult(ctx: Context, result: AiAgentResult) {
    if (result.interrupt !== undefined) {
      const keyboard = new InlineKeyboard().text('Yes', 'yes').text('No', 'no');
      await ctx.reply(toTelegramMarkdownV2(result.interrupt), {
        parse_mode: 'MarkdownV2',
        reply_markup: keyboard,
      });
      return;
    }

    const lastMessage = result.messages.at(-1);

    const photoResults = await Promise.allSettled(
      result.artifacts
        .filter((a): a is ImageArtifact => a.type === 'image')
        .map((a) => {
          const ext = a.mimeType.split('/')[1] ?? 'png';
          return ctx.replyWithPhoto(
            new InputFile(Buffer.from(a.base64, 'base64'), `image.${ext}`),
          );
        }),
    );
    const failed = photoResults.filter((r) => r.status === 'rejected').length;
    if (failed > 0)
      this.logger.warn(`Failed to send ${failed} artifact photo(s)`);
    await ctx.reply(
      toTelegramMarkdownV2(
        serializeContent(lastMessage?.content ?? 'No response'),
      ),
      { parse_mode: 'MarkdownV2' },
    );
  }

  private async getRunOptions(ctx: Context) {
    const providerChatId = ctx.chat!.id.toString();
    const identity = await this.resolveTelegramIdentity(ctx);

    const session = await this.conversationsService.getActiveSession({
      userId: identity.userId,
      provider: UserIdentityProvider.Telegram,
      providerChatId,
    });

    return { threadId: session.threadId, userId: identity.userId };
  }

  private resolveTelegramIdentity(ctx: Context): Promise<UserIdentity> {
    const from = ctx.from;
    if (!from) throw new Error('Telegram user is missing from context');

    return this.usersService.resolveIdentity({
      provider: UserIdentityProvider.Telegram,
      providerUserId: from.id.toString(),
      providerChatId: ctx.chat!.id.toString(),
      username: from.username,
      displayName: [from.first_name, from.last_name].filter(Boolean).join(' '),
      locale: from.language_code,
      metadata: {
        isBot: from.is_bot,
        chatType: ctx.chat!.type,
      },
    });
  }
}
