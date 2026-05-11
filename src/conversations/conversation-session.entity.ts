import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/users/user.entity';
import { UserIdentityProvider } from 'src/users/user-identity.entity';

export enum ConversationSessionStatus {
  Active = 'active',
  Archived = 'archived',
  Deleted = 'deleted',
}

@Entity('conversation_sessions')
@Index(['userId', 'provider', 'providerChatId', 'status'])
export class ConversationSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: UserIdentityProvider })
  provider: UserIdentityProvider;

  @Column({ name: 'provider_chat_id', type: 'varchar', nullable: true })
  providerChatId: string | null;

  @Column({ name: 'thread_id', type: 'varchar', unique: true })
  threadId: string;

  @Column({
    type: 'enum',
    enum: ConversationSessionStatus,
    default: ConversationSessionStatus.Active,
  })
  status: ConversationSessionStatus;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'last_message_at', type: 'timestamptz' })
  lastMessageAt: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;
}
