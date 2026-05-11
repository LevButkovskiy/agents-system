import { UserIdentityProvider } from 'src/users/user-identity.entity';

export interface GetActiveSessionDto {
  userId: string;
  provider: UserIdentityProvider;
  providerChatId?: string;
}

export type ResetActiveSessionDto = GetActiveSessionDto;
