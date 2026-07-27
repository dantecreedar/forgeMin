import { Injectable } from '@nestjs/common';

export interface HunterDomainSearchResult {
  domain: string;
  organization?: string;
  emails: Array<{
    value: string;
    type?: string;
    confidence?: number;
    firstName?: string;
    lastName?: string;
    position?: string;
  }>;
}

@Injectable()
export class HunterEnrichmentService {
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.HUNTER_API_KEY || null;
  }

  async searchDomain(domain: string): Promise<HunterDomainSearchResult | null> {
    if (!this.apiKey) {
      console.log('[HUNTER.IO API] No se configuró HUNTER_API_KEY.');
      return null;
    }

    try {
      const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${this.apiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.warn(`[HUNTER.IO API Error]: Status ${res.status}`);
        return null;
      }

      const data = await res.json();
      if (data.data) {
        return {
          domain: data.data.domain,
          organization: data.data.organization,
          emails: (data.data.emails || []).map((e: any) => ({
            value: e.value,
            type: e.type,
            confidence: e.confidence,
            firstName: e.first_name,
            lastName: e.last_name,
            position: e.position,
          })),
        };
      }

      return null;
    } catch (err: any) {
      console.error('Error al consultar Hunter.io API:', err?.message || err);
      return null;
    }
  }

  async verifyEmail(email: string): Promise<{ status: string; score: number } | null> {
    if (!this.apiKey) return null;

    try {
      const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;

      const data = await res.json();
      if (data.data) {
        return {
          status: data.data.status,
          score: data.data.score,
        };
      }
      return null;
    } catch (err: any) {
      console.error('Error al verificar correo en Hunter.io API:', err?.message || err);
      return null;
    }
  }
}
