import { UserIdentityProvider } from './user-identity.entity';

export interface ResolveIdentityDto {
  provider: UserIdentityProvider;
  providerUserId: string;
  providerChatId?: string;
  username?: string;
  displayName?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
}

export interface FindIdentityDto {
  userId: string;
  provider: UserIdentityProvider;
}
