/**
 * Service Google Drive pour la gestion des fichiers de sauvegarde
 * Utilise l'API Google Drive v3
 */

import { googleAuthService } from './GoogleAuthService';
import {
  DriveBackupFile,
  BackupError,
  BackupErrorCode,
  BackupMetadata,
} from './types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

// Nom du dossier racine pour les backups
const BACKUP_FOLDER_NAME = 'Score_Compte';

export class GoogleDriveService {
  private static instance: GoogleDriveService;
  private folderIdCache: string | null = null;

  private constructor() {}

  /**
   * Singleton instance
   */
  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  /**
   * Obtenir les headers d'authentification
   */
  private getAuthHeaders(): HeadersInit {
    const token = googleAuthService.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Gérer les erreurs de l'API Drive
   */
  private async handleDriveError(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData.error?.message || `Erreur HTTP ${response.status}`;

    if (response.status === 401) {
      throw new BackupError(
        BackupErrorCode.TOKEN_EXPIRED,
        'Token expiré. Veuillez vous reconnecter.'
      );
    } else if (response.status === 403) {
      if (errorMessage.includes('quota')) {
        throw new BackupError(
          BackupErrorCode.QUOTA_EXCEEDED,
          'Quota Google Drive dépassé'
        );
      }
      throw new BackupError(
        BackupErrorCode.PERMISSION_DENIED,
        'Permission refusée'
      );
    } else if (response.status === 404) {
      throw new BackupError(
        BackupErrorCode.FOLDER_NOT_FOUND,
        'Dossier ou fichier non trouvé'
      );
    } else if (response.status >= 500) {
      throw new BackupError(
        BackupErrorCode.NETWORK_ERROR,
        'Erreur serveur Google Drive'
      );
    }

    throw new BackupError(
      BackupErrorCode.UNKNOWN_ERROR,
      `Erreur Google Drive: ${errorMessage}`
    );
  }

  /**
   * Trouver ou créer le dossier de backup sur Drive
   */
  public async ensureBackupFolder(): Promise<string> {
    // Utiliser le cache si disponible
    if (this.folderIdCache) {
      return this.folderIdCache;
    }

    try {
      // Chercher le dossier existant
      const query = `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const searchUrl = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(
        query
      )}&spaces=drive&fields=files(id,name)`;

      const searchResponse = await fetch(searchUrl, {
        headers: this.getAuthHeaders(),
      });

      if (!searchResponse.ok) {
        await this.handleDriveError(searchResponse);
      }

      const searchData = await searchResponse.json();

      if (searchData.files && searchData.files.length > 0) {
        // Dossier trouvé
        this.folderIdCache = searchData.files[0].id as string;
        return this.folderIdCache;
      }

      // Créer le dossier s'il n'existe pas
      const createResponse = await fetch(`${DRIVE_API_BASE}/files`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          name: BACKUP_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });

      if (!createResponse.ok) {
        await this.handleDriveError(createResponse);
      }

      const createData = await createResponse.json();
      this.folderIdCache = createData.id as string;
      return this.folderIdCache;
    } catch (error) {
      if (error instanceof BackupError) {
        throw error;
      }
      throw new BackupError(
        BackupErrorCode.NETWORK_ERROR,
        'Impossible de créer/trouver le dossier de backup',
        error as Error
      );
    }
  }

  /**
   * Uploader un fichier de backup sur Drive
   */
  public async uploadBackup(
    fileName: string,
    content: Blob,
    metadata?: BackupMetadata
  ): Promise<{ fileId: string; size: number }> {
    try {
      await googleAuthService.ensureValidToken();
      const folderId = await this.ensureBackupFolder();

      // Métadonnées du fichier
      const fileMetadata = {
        name: fileName,
        parents: [folderId],
        description: metadata
          ? JSON.stringify({
              schemaVersion: metadata.schemaVersion,
              appVersion: metadata.appVersion,
              deviceId: metadata.deviceId,
              timestamp: metadata.timestamp,
              hash: metadata.hash,
            })
          : undefined,
      };

      // Upload multipart
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadataPart = delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(fileMetadata);

      const contentPart =
        delimiter +
        'Content-Type: application/octet-stream\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n';

      // Convertir le blob en base64
      const base64Content = await this.blobToBase64(content);

      const multipartBody =
        metadataPart + contentPart + base64Content + closeDelimiter;

      const uploadUrl = `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,size`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleAuthService.getAccessToken()}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
        },
        body: multipartBody,
      });

      if (!response.ok) {
        await this.handleDriveError(response);
      }

      const data = await response.json();
      return {
        fileId: data.id,
        size: parseInt(data.size, 10),
      };
    } catch (error) {
      if (error instanceof BackupError) {
        throw error;
      }
      throw new BackupError(
        BackupErrorCode.NETWORK_ERROR,
        'Échec de l\'upload du backup',
        error as Error
      );
    }
  }

  /**
   * Convertir un Blob en base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Lister tous les fichiers de backup
   */
  public async listBackups(): Promise<DriveBackupFile[]> {
    try {
      await googleAuthService.ensureValidToken();
      const folderId = await this.ensureBackupFolder();

      const query = `'${folderId}' in parents and trashed=false`;
      const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(
        query
      )}&orderBy=createdTime desc&fields=files(id,name,createdTime,modifiedTime,size,description)`;

      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        await this.handleDriveError(response);
      }

      const data = await response.json();
      const files: DriveBackupFile[] = [];

      for (const file of data.files || []) {
        let metadata: BackupMetadata | undefined;

        // Parser les métadonnées depuis la description
        if (file.description) {
          try {
            const parsed = JSON.parse(file.description);
            metadata = {
              schemaVersion: parsed.schemaVersion,
              appVersion: parsed.appVersion,
              deviceId: parsed.deviceId,
              environment: parsed.environment || 'production',
              timestamp: parsed.timestamp,
              size: parseInt(file.size, 10) || 0,
              hash: parsed.hash,
              compressed: parsed.compressed !== false,
            };
          } catch {
            // Ignore les erreurs de parsing
          }
        }

        files.push({
          id: file.id,
          name: file.name,
          createdTime: file.createdTime,
          modifiedTime: file.modifiedTime,
          size: parseInt(file.size, 10) || 0,
          metadata,
        });
      }

      return files;
    } catch (error) {
      if (error instanceof BackupError) {
        throw error;
      }
      throw new BackupError(
        BackupErrorCode.NETWORK_ERROR,
        'Impossible de lister les backups',
        error as Error
      );
    }
  }

  /**
   * Télécharger un fichier de backup
   */
  public async downloadBackup(fileId: string): Promise<Blob> {
    try {
      await googleAuthService.ensureValidToken();

      const url = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${googleAuthService.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        await this.handleDriveError(response);
      }

      return await response.blob();
    } catch (error) {
      if (error instanceof BackupError) {
        throw error;
      }
      throw new BackupError(
        BackupErrorCode.NETWORK_ERROR,
        'Échec du téléchargement du backup',
        error as Error
      );
    }
  }

  /**
   * Supprimer un fichier de backup
   */
  public async deleteBackup(fileId: string): Promise<void> {
    try {
      await googleAuthService.ensureValidToken();

      const url = `${DRIVE_API_BASE}/files/${fileId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${googleAuthService.getAccessToken()}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        await this.handleDriveError(response);
      }
    } catch (error) {
      if (error instanceof BackupError) {
        throw error;
      }
      throw new BackupError(
        BackupErrorCode.NETWORK_ERROR,
        'Échec de la suppression du backup',
        error as Error
      );
    }
  }

  /**
   * Supprimer les anciens backups (garder seulement les N plus récents)
   */
  public async cleanupOldBackups(keepCount: number = 5): Promise<number> {
    try {
      const backups = await this.listBackups();

      if (backups.length <= keepCount) {
        return 0; // Rien à supprimer
      }

      // Trier par date de création (plus récent en premier)
      const sortedBackups = backups.sort(
        (a, b) =>
          new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
      );

      // Garder seulement les N plus récents
      const toDelete = sortedBackups.slice(keepCount);

      // Supprimer les anciens
      let deletedCount = 0;
      for (const backup of toDelete) {
        try {
          await this.deleteBackup(backup.id);
          deletedCount++;
        } catch (error) {
          console.error(
            `Erreur lors de la suppression du backup ${backup.name}:`,
            error
          );
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Erreur lors du nettoyage des anciens backups:', error);
      return 0;
    }
  }

  /**
   * Réinitialiser le cache du dossier
   */
  public clearCache(): void {
    this.folderIdCache = null;
  }
}

// Export d'une instance singleton
export const googleDriveService = GoogleDriveService.getInstance();
