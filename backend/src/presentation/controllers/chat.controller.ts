import { Controller, Get, Post, Patch, Delete, Body, Param, Headers } from '@nestjs/common';
import { ChatService, ChatSession } from '../../application/chat/chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('sessions')
  async getSessions() {
    return this.chatService.getSessions();
  }

  @Post('sessions')
  async saveSession(@Body() session: Partial<ChatSession> & { id: string }) {
    return this.chatService.saveSession(session);
  }

  @Patch('sessions/:id')
  async updateSession(
    @Param('id') id: string,
    @Body() updates: { projectId?: string | null; projectName?: string | null; folderName?: string | null; title?: string },
  ) {
    return this.chatService.updateSession(id, updates);
  }

  @Delete('sessions/:id')
  async deleteSession(@Param('id') id: string) {
    const success = this.chatService.deleteSession(id);
    return { success };
  }

  @Post('message')
  async sendMessage(
    @Body('projectId') projectId: string,
    @Body('message') message: string,
    @Headers('x-language') language: string,
  ) {
    return this.chatService.sendMessage(projectId, message, language);
  }
}
