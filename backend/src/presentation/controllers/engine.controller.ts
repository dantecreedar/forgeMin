import { Controller, Post, Body, Headers, Inject, UnauthorizedException } from '@nestjs/common';
import { EngineService } from '../../application/engine/engine.service';
import { IAuthService, AUTH_SERVICE } from '../../domain/authentication/auth-service.interface';

@Controller('engine')
export class EngineController {
  constructor(
    private readonly engine: EngineService,
    @Inject(AUTH_SERVICE) private readonly authService: IAuthService,
  ) {}

  @Post('command')
  async command(
    @Body('message') message: string,
    @Headers('authorization') auth: string,
  ) {
    const token = auth?.replace('Bearer ', '');
    if (!token) {
      return { type: 'error', message: 'No autorizado. Inicia sesi\u00f3n primero.' };
    }
    try {
      const user = await this.authService.validateToken(token);
      const result = await this.engine.process(user.id, message);
      return result;
    } catch (e: unknown) {
      const error = e as Error;
      if (error instanceof UnauthorizedException) {
        return { type: 'error', message: 'Sesi\u00f3n expirada. Inicia sesi\u00f3n nuevamente.' };
      }
      return {
        type: 'error',
        message: error.message || 'No pude procesar la solicitud. Intenta ser m\u00e1s espec\u00edfico.',
      };
    }
  }
}
