import { Injectable, Inject } from '@nestjs/common';
import { IDriveRepository, DriveFileMetadata } from '../../domain/drive/drive.interface';

@Injectable()
export class ListDriveFilesUseCase {
  constructor(
    @Inject('IDriveRepository')
    private readonly driveRepository: IDriveRepository,
  ) {}

  async execute(accessToken: string, folderId?: string, sharedWithMe?: boolean, recents?: boolean): Promise<DriveFileMetadata[]> {
    if (!accessToken) throw new Error('accessToken es requerido');
    return await this.driveRepository.listFiles(accessToken, folderId, sharedWithMe, recents);
  }
}
