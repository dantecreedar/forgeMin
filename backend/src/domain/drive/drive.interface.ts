export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
  iconLink?: string;
  createdTime?: string;
}

export interface DriveFileContent {
  metadata: DriveFileMetadata;
  content: string;
}

export interface IDriveRepository {
  listFiles(accessToken: string, folderId?: string): Promise<DriveFileMetadata[]>;
  getFileMetadata(fileId: string, accessToken: string): Promise<DriveFileMetadata>;
  getFileContent(fileId: string, accessToken: string): Promise<DriveFileContent>;
}
