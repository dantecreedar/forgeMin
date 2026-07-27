import { Controller, Get, Post, Body, Param, Inject } from '@nestjs/common';
import { CreateLeadUseCase, CreateLeadDto } from '../../application/use-cases/leads/create-lead.use-case';
import { EnrichLeadUseCase } from '../../application/use-cases/leads/enrich-lead.use-case';
import { SendOutreachUseCase, SendOutreachDto } from '../../application/use-cases/leads/send-outreach.use-case';
import { ILeadRepository } from '../../domain/entities/lead.entity';

@Controller('leads')
export class LeadsController {
  constructor(
    private readonly createLeadUseCase: CreateLeadUseCase,
    private readonly enrichLeadUseCase: EnrichLeadUseCase,
    private readonly sendOutreachUseCase: SendOutreachUseCase,
    @Inject('ILeadRepository') private readonly leadRepository: ILeadRepository,
  ) {}

  @Get()
  async getAllLeads() {
    return await this.leadRepository.findAll();
  }

  @Get(':id')
  async getLeadById(@Param('id') id: string) {
    return await this.leadRepository.findById(id);
  }

  @Post()
  async createLead(@Body() dto: CreateLeadDto) {
    return await this.createLeadUseCase.execute(dto);
  }

  @Post(':id/enrich')
  async enrichLead(@Param('id') id: string) {
    return await this.enrichLeadUseCase.execute(id);
  }

  @Post('outreach')
  async sendOutreach(@Body() dto: SendOutreachDto) {
    return await this.sendOutreachUseCase.execute(dto);
  }
}
