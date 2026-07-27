import { Injectable } from '@nestjs/common';
import { Lead, ILeadRepository } from '../../domain/entities/lead.entity';

@Injectable()
export class InMemoryLeadRepository implements ILeadRepository {
  private leads: Map<string, Lead> = new Map();

  async save(lead: Lead): Promise<Lead> {
    this.leads.set(lead.id, lead);
    return lead;
  }

  async findById(id: string): Promise<Lead | null> {
    return this.leads.get(id) || null;
  }

  async findAll(): Promise<Lead[]> {
    return Array.from(this.leads.values());
  }

  async update(lead: Lead): Promise<Lead> {
    this.leads.set(lead.id, lead);
    return lead;
  }

  async delete(id: string): Promise<void> {
    this.leads.delete(id);
  }
}
