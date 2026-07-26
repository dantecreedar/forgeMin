import { Controller, Post, Body, Headers, Inject } from '@nestjs/common';
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
    @Headers('x-language') language: string,
  ) {
    const token = auth?.replace('Bearer ', '');
    let userId = 'default_user';

    if (token) {
      try {
        const user = await this.authService.validateToken(token);
        userId = user.id;
      } catch {
        userId = 'default_user';
      }
    }

    try {
      const result = await this.engine.process(userId, message, language);
      return result;
    } catch (e: unknown) {
      const error = e as Error;
      return {
        type: 'chat',
        message: error.message || (language === 'en' ? 'Could not process request at this moment.' : 'No pude procesar la solicitud en este momento.'),
      };
    }
  }
}
