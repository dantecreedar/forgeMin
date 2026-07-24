import { Controller, Post, Get, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthApplicationService } from '../../application/authentication/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthApplicationService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body('token') token: string) {
    const user = await this.authService.validateToken(token);
    return { user };
  }

  @Post('register')
  async register(
    @Body('email') email: string,
    @Body('displayName') displayName: string,
    @Body('photoUrl') photoUrl?: string,
  ) {
    const user = await this.authService.createUser(email, displayName, photoUrl);
    return { user };
  }

  @Get('me')
  async getProfile(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    const user = await this.authService.validateToken(token ?? '');
    return { user };
  }
}
