import { autoRetry } from '@grammyjs/auto-retry';
import { stream, StreamFlavor } from '@grammyjs/stream';
import { HumanMessage } from '@langchain/core/messages';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Context, InputFile } from 'grammy';

import { AiService } from '../../ai/ai.service';
import { ImageArtifact } from '../../ai/state';
import { serializeContent } from '../../ai/utils';

type BotContext = StreamFlavor<Context>;

const ALBUM_FLUSH_MS = 1500;

interface PhotoData {
  base64: string;
  mimeType: string;
}

interface AlbumBuffer {
  photos: Promise<PhotoData>[];
  caption?: string;
  ctx: BotContext;
  timer?: ReturnType<typeof setTimeout>;
}

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Bot<BotContext>;
  private readonly streamingEnabled: boolean;
  private readonly albumBuffers = new Map<string, AlbumBuffer>();

  constructor(
    private readonly configService: ConfigService,
    private readonly aiService: AiService,
  ) {
    this.streamingEnabled = this.configService.get<boolean>(
      'telegram.streaming',
      false,
    );
  }

  onModuleInit() {
    const token = this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    this.bot = new Bot<BotContext>(token);

    if (this.streamingEnabled) {
      this.bot.api.config.use(autoRetry());
      this.bot.use(stream());
    }

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

    void this.bot.start();
  }

  async onModuleDestroy() {
    for (const buffer of this.albumBuffers.values()) {
      clearTimeout(buffer.timer);
    }
    this.albumBuffers.clear();
    await this.bot.stop();
  }

  private async handleTextMessage(ctx: BotContext) {
    const text = ctx.message!.text!;
    const threadId = ctx.chat!.id.toString();

    if (this.streamingEnabled && ctx.chat?.type === 'private') {
      await ctx.replyWithStream(this.aiService.stream(text, threadId));
    } else {
      await this.sendResult(ctx, await this.aiService.run(text, threadId));
    }
  }

  private async handlePhotoMessage(ctx: BotContext) {
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

  private bufferAlbumPhoto(
    mediaGroupId: string,
    photo: Promise<PhotoData>,
    caption: string | undefined,
    ctx: BotContext,
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
    ctx: BotContext,
    photos: PhotoData[],
    caption: string | undefined,
  ) {
    const threadId = ctx.chat!.id.toString();
    const imageBlocks = photos.map((p) => ({
      type: 'image' as const,
      data: p.base64,
      mimeType: p.mimeType,
    }));
    const message = new HumanMessage({
      content: [
        ...(caption ? [{ type: 'text' as const, text: caption }] : []),
        ...imageBlocks,
      ],
    });
    const contextImages = imageBlocks.map(({ data, mimeType }) => ({
      data,
      mimeType,
    }));

    await this.sendResult(
      ctx,
      await this.aiService.run(message, threadId, contextImages),
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

  private async sendResult(
    ctx: BotContext,
    result: Awaited<ReturnType<AiService['run']>>,
  ) {
    const lastMessage = result.messages.at(-1);

    await Promise.all(
      result.artifacts
        .filter((a): a is ImageArtifact => a.type === 'image')
        .map((a) => {
          const ext = a.mimeType.split('/')[1] ?? 'png';
          return ctx.replyWithPhoto(
            new InputFile(Buffer.from(a.base64, 'base64'), `image.${ext}`),
          );
        }),
    );
    await ctx.reply(serializeContent(lastMessage?.content ?? 'No response'));
  }
}
