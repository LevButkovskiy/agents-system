import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import {
  ConversationSession,
  ConversationSessionStatus,
} from './conversation-session.entity';
import {
  GetActiveSessionDto,
  ResetActiveSessionDto,
} from './conversations.types';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(ConversationSession)
    private readonly sessionsRepo: Repository<ConversationSession>,
  ) {}

  async getActiveSession(
    dto: GetActiveSessionDto,
  ): Promise<ConversationSession> {
    const providerChatId = dto.providerChatId ?? null;
    const providerChatIdWhere = providerChatId ?? IsNull();
    const existing = await this.sessionsRepo.findOne({
      where: {
        userId: dto.userId,
        provider: dto.provider,
        providerChatId: providerChatIdWhere,
        status: ConversationSessionStatus.Active,
      },
      order: { startedAt: 'DESC' },
    });

    if (existing) {
      existing.lastMessageAt = new Date();
      return this.sessionsRepo.save(existing);
    }

    return this.createSession(dto);
  }

  async resetActiveSession(
    dto: ResetActiveSessionDto,
  ): Promise<ConversationSession> {
    const providerChatId = dto.providerChatId ?? null;
    const providerChatIdWhere = providerChatId ?? IsNull();
    await this.sessionsRepo.update(
      {
        userId: dto.userId,
        provider: dto.provider,
        providerChatId: providerChatIdWhere,
        status: ConversationSessionStatus.Active,
      },
      {
        status: ConversationSessionStatus.Archived,
        endedAt: new Date(),
      },
    );

    return this.createSession(dto);
  }

  private createSession(
    dto: GetActiveSessionDto,
  ): Promise<ConversationSession> {
    const providerChatId = dto.providerChatId ?? null;
    const session = this.sessionsRepo.create({
      userId: dto.userId,
      provider: dto.provider,
      providerChatId,
      threadId: this.buildThreadId(dto.userId, dto.provider, providerChatId),
      status: ConversationSessionStatus.Active,
      lastMessageAt: new Date(),
    });
    return this.sessionsRepo.save(session);
  }

  private buildThreadId(
    userId: string,
    provider: string,
    providerChatId: string | null,
  ): string {
    const channel = providerChatId ? `:${providerChatId}` : '';
    return `user:${userId}:${provider}${channel}:session:${randomUUID()}`;
  }
}
