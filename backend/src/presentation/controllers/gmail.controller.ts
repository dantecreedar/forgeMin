import { Controller, Get, Post, Body, Query, Res } from '@nestjs/common';
import { GmailService } from '../../infrastructure/gmail/gmail.service';

@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get('auth-url')
  getAuthUrl() {
    const url = this.gmailService.getAuthUrl();
    return { url };
  }

  @Get('callback')
  async handleCallback(@Query('code') code: string, @Res() res: any) {
    if (!code) {
      return res.redirect('http://localhost:3000?gmail_status=error');
    }
    try {
      const tokens = await this.gmailService.getTokens(code);
      const profile = await this.gmailService.getProfile(tokens.access_token);

      // Redirect back to frontend with tokens & profile encoded in query
      const params = new URLSearchParams({
        gmail_status: 'success',
        access_token: tokens.access_token,
        email: profile.email,
        name: profile.name || '',
      });
      return res.redirect(`http://localhost:3000/dashboard?${params.toString()}`);
    } catch (err: any) {
      return res.redirect(`http://localhost:3000?gmail_status=error&message=${encodeURIComponent(err.message)}`);
    }
  }

  @Post('exchange-code')
  async exchangeCode(@Body('code') code: string) {
    const tokens = await this.gmailService.getTokens(code);
    const profile = await this.gmailService.getProfile(tokens.access_token);
    return { tokens, profile };
  }

  @Post('send-report')
  async sendReport(
    @Body('accessToken') accessToken: string,
    @Body('to') to: string,
    @Body('subject') subject: string,
    @Body('content') content: string,
    @Body('projectName') projectName?: string,
  ) {
    if (!accessToken) {
      throw new Error('Debes vincular tu cuenta de Gmail para enviar reportes por correo.');
    }
    if (!to) {
      throw new Error('Ingresa un correo electrónico destinatario.');
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-bottom: 4px;">ForgeMind - Reporte del Proyecto</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 0;">Proyecto: <strong>${projectName || 'ForgeMind'}</strong></p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 16px 0;" />
        <div style="font-size: 14px; color: #334155; line-height: 1.6; whitespace: pre-wrap;">
          ${content.replace(/\n/g, '<br/>')}
        </div>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center;">Generado automáticamente por ForgeMind Engineering Platform.</p>
      </div>
    `;

    const result = await this.gmailService.sendEmail(accessToken, to, subject || `Reporte de Avances: ${projectName || 'ForgeMind'}`, htmlBody);
    return result;
  }
}
