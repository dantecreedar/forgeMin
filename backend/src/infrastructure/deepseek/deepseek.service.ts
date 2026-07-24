import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  reply: string;
}

@Injectable()
export class DeepSeekService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.deepseek.com';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('DEEPSEEK_API');
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${error}`);
    }

    const data = await response.json();
    return { reply: data.choices[0].message.content };
  }

  async createObjectiveFromText(text: string): Promise<{
    title: string;
    description?: string;
    tags?: string[];
  }> {
    const response = await this.chat([
      {
        role: 'system',
        content: `Eres un asistente de ingeniería. Analiza el texto del usuario y extrae la información para crear un objetivo de proyecto.
Responde ÚNICAMENTE con JSON en este formato:
{
  "title": "título del objetivo",
  "description": "descripción detallada",
  "tags": ["tag1", "tag2"]
}
No incluyas markdown ni texto adicional.`,
      },
      { role: 'user', content: text },
    ]);

    const jsonMatch = response.reply.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse objective from AI response');
    return JSON.parse(jsonMatch[0]);
  }
}
