import { Injectable } from '@nestjs/common';

export interface IGmailTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface IGmailProfile {
  email: string;
  name?: string;
  picture?: string;
}

@Injectable()
export class GmailService {
  private get clientId(): string | undefined {
    return process.env.GOOGLE_CLIENT_ID;
  }

  private get clientSecret(): string | undefined {
    return process.env.GOOGLE_CLIENT_SECRET;
  }

  private get redirectUri(): string {
    return process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/gmail/callback';
  }

  getAuthUrl(): string {
    if (!this.clientId) {
      throw new Error('GOOGLE_CLIENT_ID no configurado en backend/.env');
    }
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async getTokens(code: string): Promise<IGmailTokens> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Credenciales de Google OAuth2 no configuradas.');
    }

    const body = new URLSearchParams({
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      grant_type: 'authorization_code',
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.error || 'Error al obtener tokens de Google');
    }

    return data as IGmailTokens;
  }

  async getProfile(accessToken: string): Promise<IGmailProfile> {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error('Error al obtener perfil de usuario de Google');
    }
    return {
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  }

  async sendEmail(accessToken: string, to: string, subject: string, bodyHtml: string, fromEmail?: string): Promise<{ success: boolean; messageId?: string }> {
    const from = fromEmail || 'me';
    const rawEmail = this.encodeRawEmail(to, from, subject, bodyHtml);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawEmail }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Error al enviar el correo vía Gmail API');
    }

    return { success: true, messageId: data.id };
  }

  async listMessages(accessToken: string, maxResults = 8): Promise<Array<{ id: string; snippet: string; subject?: string; from?: string; date?: string }>> {
    const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const listData = await listRes.json();
    if (!listRes.ok) {
      throw new Error(listData.error?.message || 'Error al obtener mensajes de Gmail');
    }

    const messages = listData.messages || [];
    const detailedMessages = await Promise.all(
      messages.map(async (msgItem: { id: string }) => {
        try {
          const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgItem.id}?format=full`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const detail = await detailRes.json();
          const headers = detail.payload?.headers || [];
          const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'Sin asunto';
          const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Remitente desconocido';
          const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

          return {
            id: msgItem.id,
            snippet: detail.snippet || '',
            subject,
            from,
            date,
          };
        } catch {
          return null;
        }
      })
    );

    return detailedMessages.filter(Boolean) as any;
  }

  private encodeRawEmail(to: string, from: string, subject: string, bodyHtml: string): string {
    const emailLines = [
      `To: ${to}`,
      `From: ${from}`,
      `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      bodyHtml,
    ];
    const email = emailLines.join('\r\n');
    return Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}
