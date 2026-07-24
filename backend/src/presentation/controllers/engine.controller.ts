import { Controller, Post, Body, Headers } from '@nestjs/common';
import { EngineService } from '../../application/engine/engine.service';

@Controller('engine')
export class EngineController {
  constructor(private readonly engine: EngineService) {}

  @Post('command')
  async command(
    @Body('message') message: string,
    @Headers('authorization') auth: string,
  ) {
    const token = auth?.replace('Bearer ', '');
    const userId = token ? this.extractUserId(token) : 'default';
    try {
      const result = await this.engine.process(userId, message);
      return result;
    } catch (e: unknown) {
      const error = e as Error;
      return {
        type: 'error',
        message: error.message || 'No pude procesar la solicitud. Intenta ser m�s espec�fico.',
      };
    }
  }

  private extractUserId(_token: string): string {
    try {
      const parts = _token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        return payload.user_id || payload.sub || 'default';
      }
    } catch { /* ignore */ }
    return 'default';
  }
}
