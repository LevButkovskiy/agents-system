import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserIdentity } from './user-identity.entity';
import { User } from './user.entity';
import { FindIdentityDto, ResolveIdentityDto } from './users.types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(UserIdentity)
    private readonly identitiesRepo: Repository<UserIdentity>,
  ) {}

  async resolveIdentity(dto: ResolveIdentityDto): Promise<UserIdentity> {
    const identity = await this.identitiesRepo.findOne({
      where: {
        provider: dto.provider,
        providerUserId: dto.providerUserId,
      },
      relations: { user: true },
    });

    if (identity) {
      const updated = this.identitiesRepo.merge(identity, {
        providerChatId: dto.providerChatId ?? identity.providerChatId,
        username: dto.username ?? identity.username,
        metadata: { ...identity.metadata, ...dto.metadata },
      });
      return this.identitiesRepo.save(updated);
    }

    const user = await this.usersRepo.save(
      this.usersRepo.create({
        displayName: dto.displayName ?? dto.username ?? null,
        locale: dto.locale ?? null,
      }),
    );

    return this.identitiesRepo.save(
      this.identitiesRepo.create({
        user,
        userId: user.id,
        provider: dto.provider,
        providerUserId: dto.providerUserId,
        providerChatId: dto.providerChatId ?? null,
        username: dto.username ?? null,
        metadata: dto.metadata ?? {},
      }),
    );
  }

  findIdentity(dto: FindIdentityDto): Promise<UserIdentity | null> {
    return this.identitiesRepo.findOne({
      where: {
        userId: dto.userId,
        provider: dto.provider,
      },
      relations: { user: true },
      order: { lastSeenAt: 'DESC' },
    });
  }
}
