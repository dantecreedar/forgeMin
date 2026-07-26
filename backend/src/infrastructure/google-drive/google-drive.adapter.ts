import { Injectable, Logger } from '@nestjs/common';
import { IDriveRepository, DriveFileMetadata, DriveFileContent } from '../../domain/drive/drive.interface';

@Injectable()
export class GoogleDriveAdapter implements IDriveRepository {
  private readonly logger = new Logger(GoogleDriveAdapter.name);
  private readonly baseUrl = 'https://www.googleapis.com/drive/v3/files';

  async listFiles(accessToken: string, folderId?: string, sharedWithMe?: boolean): Promise<DriveFileMetadata[]> {
    try {
      let q = '';
      if (sharedWithMe) {
        q = 'sharedWithMe = true and trashed = false';
      } else {
        const parentQuery = folderId ? `'${folderId}' in parents` : `'root' in parents`;
        q = `${parentQuery} and trashed = false`;
      }
      const fields = 'files(id,name,mimeType,size,webViewLink,iconLink,createdTime)';
      const url = `${this.baseUrl}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&orderBy=folder,name`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Error al listar archivos de Drive: ${errorText}`);
        throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return (data.files || []).map((file: any) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size ? parseInt(file.size, 10) : undefined,
        webViewLink: file.webViewLink,
        iconLink: file.iconLink,
        createdTime: file.createdTime,
      }));
    } catch (error: any) {
      this.logger.error(`Excepción listando archivos de Drive: ${error.message}`);
      throw error;
    }
  }

  async getFileMetadata(fileId: string, accessToken: string): Promise<DriveFileMetadata> {
    try {
      const url = `${this.baseUrl}/${fileId}?fields=id,name,mimeType,size,webViewLink,iconLink`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Error al obtener metadatos de Drive [${fileId}]: ${errorText}`);
        throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        name: data.name,
        mimeType: data.mimeType,
        size: data.size ? parseInt(data.size, 10) : undefined,
        webViewLink: data.webViewLink,
        iconLink: data.iconLink,
      };
    } catch (error: any) {
      this.logger.error(`Excepción obteniendo metadatos de archivo Drive ${fileId}: ${error.message}`);
      throw error;
    }
  }

  async getFileContent(fileId: string, accessToken: string): Promise<DriveFileContent> {
    const metadata = await this.getFileMetadata(fileId, accessToken);
    let rawContent = '';

    try {
      if (metadata.mimeType.startsWith('image/') || metadata.mimeType.startsWith('audio/')) {
        // Fetch binary data and convert to Base64 Data URI for media playback
        const downloadUrl = `${this.baseUrl}/${fileId}?alt=media`;
        const res = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`Media download failed: ${res.statusText}`);
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        rawContent = `data:${metadata.mimeType};base64,${buffer.toString('base64')}`;
      } else if (metadata.mimeType.startsWith('video/')) {
        // Provide Google Drive embed preview URL for videos
        rawContent = `https://drive.google.com/file/d/${fileId}/preview`;
      } else if (metadata.mimeType === 'application/pdf' || metadata.name.toLowerCase().endsWith('.pdf')) {
        // Provide Google Drive embed preview URL for PDF documents
        rawContent = `https://drive.google.com/file/d/${fileId}/preview`;
      } else if (metadata.mimeType === 'application/vnd.google-apps.document') {
        // Export Google Docs to plain text
        const exportUrl = `${this.baseUrl}/${fileId}/export?mimeType=text/plain`;
        const res = await fetch(exportUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
        rawContent = await res.text();
      } else if (metadata.mimeType === 'application/vnd.google-apps.spreadsheet') {
        // Export Google Sheets to CSV
        const exportUrl = `${this.baseUrl}/${fileId}/export?mimeType=text/csv`;
        const res = await fetch(exportUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
        rawContent = await res.text();
      } else {
        // Direct media download for plain text / standard files
        const downloadUrl = `${this.baseUrl}/${fileId}?alt=media`;
        const res = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
        rawContent = await res.text();
      }
    } catch (error: any) {
      this.logger.error(`Error leyendo contenido de archivo Drive ${fileId}: ${error.message}`);
      rawContent = `[No se pudo extraer el archivo: ${metadata.name}]`;
    }

    // Clean binary junk from docx / text files if not media base64/url
    let cleanContent = rawContent;
    if (metadata.name.toLowerCase().endsWith('.docx') || metadata.mimeType.includes('wordprocessingml')) {
      const textMatches = rawContent.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
      if (textMatches && textMatches.length > 0) {
        cleanContent = textMatches
          .map((m) => m.replace(/<[^>]+>/g, '').trim())
          .filter((t) => t.length > 0)
          .join(' ');
      } else {
        cleanContent = rawContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ').replace(/ {3,}/g, '\n').trim();
      }
    } else if (!metadata.mimeType.startsWith('image/') && !metadata.mimeType.startsWith('audio/') && !metadata.mimeType.startsWith('video/')) {
      cleanContent = rawContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
      cleanContent = cleanContent.replace(/ {3,}/g, '\n').trim();
    }

    return {
      metadata,
      content: cleanContent || `[Documento ${metadata.name}]`,
    };
  }
}
