import { Report, ReportType } from './report.entity';

export const REPORT_REPOSITORY = 'REPORT_REPOSITORY';

export interface IReportRepository {
  findById(id: string): Promise<Report | null>;
  findByProjectId(projectId: string): Promise<Report[]>;
  findByProjectIdAndType(projectId: string, type: ReportType): Promise<Report[]>;
  save(report: Report): Promise<void>;
  delete(id: string): Promise<void>;
}
