import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessageEntity } from './entity/chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatAdminController } from './chat-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessageEntity])],
  controllers: [ChatController, ChatAdminController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}