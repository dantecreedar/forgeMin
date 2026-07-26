import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ReadDriveFileUseCase } from '../../application/drive/read-drive-file.use-case';
import { ListDriveFilesUseCase } from '../../application/drive/list-drive-files.use-case';

@Controller('drive')
export class DriveController {
  constructor(
    private readonly readDriveFileUseCase: ReadDriveFileUseCase,
    private readonly listDriveFilesUseCase: ListDriveFilesUseCase,
  ) {}

  @Post('list-files')
  async listFiles(
    @Body('accessToken') accessToken: string,
    @Body('folderId') folderId?: string,
    @Body('sharedWithMe') sharedWithMe?: boolean,
  ) {
    if (!accessToken) {
      throw new BadRequestException('Se requiere accessToken para listar archivos de Google Drive.');
    }
    return await this.listDriveFilesUseCase.execute(accessToken, folderId, sharedWithMe);
  }

  @Post('read-file')
  async readFile(
    @Body('fileId') fileId: string,
    @Body('accessToken') accessToken: string,
  ) {
    if (!fileId || !accessToken) {
      throw new BadRequestException('Se requieren fileId y accessToken para leer el archivo de Google Drive.');
    }
    return await this.readDriveFileUseCase.execute(fileId, accessToken);
  }
}
