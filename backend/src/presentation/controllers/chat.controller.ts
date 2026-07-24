import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from '../../application/chat/chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  async sendMessage(
    @Body('projectId') projectId: string,
    @Body('message') message: string,
  ) {
    return this.chatService.sendMessage(projectId, message);
  }
}
