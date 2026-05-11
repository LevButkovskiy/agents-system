import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationSession } from './conversation-session.entity';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationSession])],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
