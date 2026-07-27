import { Controller, Get, Query, Res } from '@nestjs/common';
import { LinkedInService } from '../../infrastructure/linkedin/linkedin.service';
import { Response } from 'express';

@Controller('linkedin')
export class LinkedInController {
  constructor(private readonly linkedinService: LinkedInService) {}

  @Get('auth')
  initiateAuth(@Res() res: Response) {
    const url = this.linkedinService.getAuthorizationUrl();
    res.redirect(url);
  }

  @Get('callback')
  async handleCallback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      return res.redirect('http://localhost:3000/dashboard/leads?linkedin_connected=false');
    }
    const success = await this.linkedinService.handleCallback(code);
    if (success) {
      return res.redirect('http://localhost:3000/dashboard/leads?linkedin_connected=true');
    }
    return res.redirect('http://localhost:3000/dashboard/leads?linkedin_connected=false');
  }

  @Get('status')
  getStatus() {
    return { connected: this.linkedinService.hasToken() };
  }

  @Get('me')
  getMyProfile() {
    const profile = this.linkedinService.getMyProfile();
    if (!profile) {
      return { connected: false, profile: null };
    }
    return { connected: true, profile };
  }

  @Get('search')
  async searchPeople(
    @Query('industry') industry: string,
    @Query('role') role: string,
    @Query('page') page = '0',
  ) {
    if (!this.linkedinService.hasToken()) {
      return { connected: false, people: [], total: 0, hasMore: false };
    }
    const result = await this.linkedinService.searchPeople(
      industry || 'Technology',
      role || 'CEO',
      parseInt(page, 10),
    );
    return { connected: true, ...result };
  }
}
