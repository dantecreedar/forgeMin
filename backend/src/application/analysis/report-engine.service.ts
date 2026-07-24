import { Injectable } from '@nestjs/common';
import { GeminiService } from '../../infrastructure/gemini/gemini.service';
import { Report, ReportType, ReportFormat, IReportSection } from '../../domain/report/report.entity';
import { IReportRepository, REPORT_REPOSITORY } from '../../domain/report/report.repository.interface';
import { Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReportEngineService {
  constructor(
    private readonly geminiService: GeminiService,
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: IReportRepository,
  ) {}

  async generateReport(
    projectId: string,
    type: ReportType,
    objectives: unknown[],
    timeline: unknown[],
    commits: unknown[],
  ): Promise<Report> {
    const content = await this.geminiService.generateReport(type, objectives, timeline, commits);

    const now = new Date();
    const startOfPeriod = this.getPeriodStart(now, type);

    const report = new Report(
      uuidv4(), projectId, type, ReportFormat.MARKDOWN,
      `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${now.toISOString().split('T')[0]}`,
      content.summary,
      content.sections.map((s, i) => ({ title: s.title, content: s.content, order: i })),
      'ai-engine',
      startOfPeriod,
      now,
      {},
      now,
    );

    await this.reportRepository.save(report);
    return report;
  }

  private getPeriodStart(date: Date, type: ReportType): Date {
    const d = new Date(date);
    switch (type) {
      case ReportType.DAILY:
        d.setDate(d.getDate() - 1);
        break;
      case ReportType.WEEKLY:
        d.setDate(d.getDate() - 7);
        break;
      case ReportType.MONTHLY:
        d.setMonth(d.getMonth() - 1);
        break;
    }
    return d;
  }
}
