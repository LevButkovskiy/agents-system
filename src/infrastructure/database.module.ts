import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from 'src/connectors/tasks/task.entity';
import { ConversationSession } from 'src/conversations/conversation-session.entity';
import { UserIdentity } from 'src/users/user-identity.entity';
import { User } from 'src/users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('database.url'),
        entities: [Task, User, UserIdentity, ConversationSession],
        synchronize: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
