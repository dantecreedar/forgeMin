import { Injectable, Inject } from '@nestjs/common';
import { IDriveRepository, DriveFileContent } from '../../domain/drive/drive.interface';

@Injectable()
export class ReadDriveFileUseCase {
  constructor(
    @Inject('IDriveRepository')
    private readonly driveRepository: IDriveRepository,
  ) {}

  async execute(fileId: string, accessToken: string): Promise<DriveFileContent> {
    if (!fileId) throw new Error('fileId es requerido');
    if (!accessToken) throw new Error('accessToken es requerido');

    return await this.driveRepository.getFileContent(fileId, accessToken);
  }
}
