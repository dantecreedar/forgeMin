import { Injectable } from '@nestjs/common';

export interface ApolloPersonSearchResult {
  name: string;
  email: string;
  title: string;
  company: string;
  linkedinUrl?: string;
  domain?: string;
}

@Injectable()
export class ApolloEnrichmentService {
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.APOLLO_API_KEY || null;
  }

  async searchPeopleByDomain(domain: string): Promise<ApolloPersonSearchResult[]> {
    if (!this.apiKey) {
      console.log('[APOLLO API] No se configuró APOLLO_API_KEY. Usando datos simulados.');
      return [];
    }

    try {
      // Llamada real a Apollo REST API (People Search / Match)
      const res = await fetch('https://api.apollo.io/v1/people/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          domain: domain,
          reveal_personal_emails: true,
        }),
      });

      if (!res.ok) {
        console.warn(`[APOLLO API Error]: Status ${res.status}`);
        return [];
      }

      const data = await res.json();
      if (data.person) {
        return [
          {
            name: `${data.person.first_name || ''} ${data.person.last_name || ''}`.trim(),
            email: data.person.email || '',
            title: data.person.title || '',
            company: data.person.organization?.name || domain,
            linkedinUrl: data.person.linkedin_url || undefined,
            domain: domain,
          },
        ];
      }

      return [];
    } catch (err: any) {
      console.error('Error al consultar Apollo API:', err?.message || err);
      return [];
    }
  }
}
