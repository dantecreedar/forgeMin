import { Injectable } from '@nestjs/common';
import { IReportRepository } from '../../domain/report/report.repository.interface';
import { Report, ReportType, IReport } from '../../domain/report/report.entity';
import { FirestoreRepository } from './firestore-repository';

@Injectable()
export class FirestoreReportRepository extends FirestoreRepository<Report> implements IReportRepository {
  protected collectionName = 'reports';

  async findByProjectId(projectId: string): Promise<Report[]> {
    return this.findByField('projectId', projectId);
  }

  async findByProjectIdAndType(projectId: string, type: ReportType): Promise<Report[]> {
    const snapshot = await this.collection
      .where('projectId', '==', projectId)
      .where('type', '==', type)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Report));
  }
}
