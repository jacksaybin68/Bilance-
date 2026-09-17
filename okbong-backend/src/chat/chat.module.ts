import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatManagementController } from './chat-management.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ConversationEntity } from './entities/conversation.entity';
import { MessageEntity } from './entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationEntity, MessageEntity])],
  controllers: [ChatController, ChatManagementController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}
