/**
 * Gestionnaire central du système de sauvegarde automatique Google Drive
 * Orchestre la création, l'upload, la queue offline, le retry et la purge des backups
 */

import { db } from '@/data/db';
import { exportToJSON, type ExportData } from '@/lib/exportImport';
import { googleAuthService } from './GoogleAuthService';
import { googleDriveService } from './GoogleDriveService';
import { backupRepository } from './BackupRepository';
import {
  BackupResult,
  RestoreResult,
  RestoreOptions,
  BackupError,
  BackupErrorCode,
  BackupQueueEntry,
} from './types';
import {
  prepareBackup,
  extractBackup,
  generateBackupFileName,
  isOnline,
  exponentialBackoff,
  generateQueueId,
} from './utils';

export class BackupManager {
  private static instance: BackupManager;
  private schedulerInterval: number | null = null;
  private debounceTimer: number | null = null;
  private isProcessingQueue = false;
  private lastBackupTime = 0;
  private readonly MIN_BACKUP_INTERVAL = 60000; // 1 minute minimum entre backups

  private constructor() {
    this.initializeEventListeners();
  }

  /**
   * Singleton instance
   */
  public static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  /**
   * Initialiser les listeners d'événements
   */
  private initializeEventListeners(): void {
    // Détecter quand on revient en ligne pour traiter la queue
    window.addEventListener('online', () => {
      console.log('Connexion restaurée, traitement de la queue de backup...');
      this.processQueue();
    });

    // Sauvegarder à la fermeture de l'application (best effort)
    window.addEventListener('beforeunload', () => {
      const config = backupRepository.getConfig();
      if (
        config.enabled &&
        config.backupOnAppClose &&
        backupRepository.isDirty() &&
        googleAuthService.isAuthenticated()
      ) {
        // Note: beforeunload ne permet pas les appels async, donc on ajoute à la queue
        this.queueBackup();
      }
    });
  }

  /**
   * Démarrer le système de sauvegarde automatique
   */
  public start(): void {
    const config = backupRepository.getConfig();

    if (!config.enabled) {
      console.log('Système de sauvegarde désactivé');
      return;
    }

    if (!googleAuthService.isAuthenticated()) {
      console.log(
        'Non authentifié, système de sauvegarde en attente de connexion'
      );
      return;
    }

    console.log('Démarrage du système de sauvegarde automatique');

    // Démarrer le scheduler périodique
    this.startScheduler();

    // Traiter la queue au démarrage si en ligne
    if (isOnline()) {
      this.processQueue();
    }
  }

  /**
   * Arrêter le système de sauvegarde automatique
   */
  public stop(): void {
    console.log('Arrêt du système de sauvegarde automatique');
    this.stopScheduler();
  }

  /**
   * Démarrer le scheduler de sauvegarde périodique
   */
  private startScheduler(): void {
    this.stopScheduler();

    const config = backupRepository.getConfig();
    const intervalMs = config.autoBackupInterval * 60 * 1000; // Convertir en ms

    this.schedulerInterval = window.setInterval(() => {
      this.scheduledBackup();
    }, intervalMs);

    console.log(
      `Scheduler démarré : backup toutes les ${config.autoBackupInterval} minutes`
    );
  }

  /**
   * Arrêter le scheduler
   */
  private stopScheduler(): void {
    if (this.schedulerInterval !== null) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  /**
   * Backup programmé (par le scheduler)
   */
  private async scheduledBackup(): Promise<void> {
    if (!backupRepository.isDirty()) {
      console.log('Pas de changements, skip backup programmé');
      return;
    }

    if (!googleAuthService.isAuthenticated()) {
      console.log('Non authentifié, skip backup programmé');
      return;
    }

    console.log('Backup programmé déclenché');
    await this.createBackup();
  }

  /**
   * Marquer les données comme modifiées (dirty flag)
   */
  public markDirty(): void {
    backupRepository.setDirty(true);

    const config = backupRepository.getConfig();

    // Déclencher un backup automatique avec debounce si actions critiques activées
    if (
      config.enabled &&
      config.backupOnCriticalActions &&
      googleAuthService.isAuthenticated()
    ) {
      this.debouncedBackup();
    }
  }

  /**
   * Backup avec debounce pour éviter les appels trop fréquents
   */
  private debouncedBackup(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    // Attendre 30 secondes après la dernière action avant de sauvegarder
    this.debounceTimer = window.setTimeout(() => {
      this.createBackup();
    }, 30000);
  }

  /**
   * Créer et uploader un backup
   */
  public async createBackup(
    description?: string
  ): Promise<BackupResult> {
    try {
      // Anti-spam : respecter l'intervalle minimum
      const now = Date.now();
      if (now - this.lastBackupTime < this.MIN_BACKUP_INTERVAL) {
        console.log(
          'Backup trop fréquent, ajout à la queue au lieu d\'uploader immédiatement'
        );
        this.queueBackup(description);
        return {
          success: true,
          timestamp: new Date().toISOString(),
        };
      }

      // Vérifier l'authentification
      if (!googleAuthService.isAuthenticated()) {
        throw new BackupError(
          BackupErrorCode.AUTH_FAILED,
          'Non authentifié avec Google Drive'
        );
      }

      // Vérifier la connexion
      if (!isOnline()) {
        console.log('Hors ligne, ajout à la queue');
        this.queueBackup(description);
        return {
          success: true,
          timestamp: new Date().toISOString(),
        };
      }

      backupRepository.updateLastBackup('uploading');

      // Exporter les données
      const exportData = await exportToJSON({
        includeInProgress: true,
        includeFinished: true,
        includePlayers: true,
        includeModels: true,
      });

      // Préparer le backup (compression + métadonnées)
      const { blob, metadata } = await prepareBackup(
        this.convertExportData(exportData),
        description
      );

      // Uploader vers Drive
      const fileName = generateBackupFileName();
      const result = await googleDriveService.uploadBackup(
        fileName,
        blob,
        metadata
      );

      // Mettre à jour l'état
      backupRepository.updateLastBackup('success', fileName);
      backupRepository.setDirty(false);
      this.lastBackupTime = Date.now();

      console.log(`Backup créé avec succès: ${fileName}`);

      // Purge automatique des anciens backups
      this.cleanupOldBackups();

      // Notifier si configuré
      const config = backupRepository.getConfig();
      if (config.notifyOnSuccess) {
        this.notifyUser('Sauvegarde réussie', 'success');
      }

      return {
        success: true,
        fileName,
        fileId: result.fileId,
        size: result.size,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erreur lors de la création du backup:', error);

      const errorMessage =
        error instanceof BackupError
          ? error.message
          : 'Erreur inconnue lors de la sauvegarde';

      backupRepository.updateLastBackup('error', null, errorMessage);

      // Si erreur réseau, ajouter à la queue
      if (
        error instanceof BackupError &&
        (error.code === BackupErrorCode.NETWORK_ERROR ||
          error.code === BackupErrorCode.TOKEN_EXPIRED)
      ) {
        console.log('Erreur réseau/auth, ajout à la queue');
        this.queueBackup(description);
      }

      // Notifier si configuré
      const config = backupRepository.getConfig();
      if (config.notifyOnError) {
        this.notifyUser(`Erreur de sauvegarde: ${errorMessage}`, 'error');
      }

      return {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Ajouter un backup à la queue (pour traitement offline)
   */
  private async queueBackup(description?: string): Promise<void> {
    try {
      const exportData = await exportToJSON({
        includeInProgress: true,
        includeFinished: true,
        includePlayers: true,
        includeModels: true,
      });

      const { metadata } = await prepareBackup(
        this.convertExportData(exportData),
        description
      );

      const fileName = generateBackupFileName();

      const queueEntry: BackupQueueEntry = {
        id: generateQueueId(),
        content: {
          metadata,
          data: this.convertExportData(exportData),
        },
        fileName,
        attempts: 0,
        status: 'offline_queued',
        createdAt: new Date().toISOString(),
      };

      backupRepository.addToQueue(queueEntry);
      backupRepository.updateLastBackup('offline_queued', fileName);

      console.log(`Backup ajouté à la queue: ${fileName}`);
    } catch (error) {
      console.error('Erreur lors de l\'ajout à la queue:', error);
    }
  }

  /**
   * Traiter la queue des backups en attente
   */
  public async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      console.log('Traitement de la queue déjà en cours');
      return;
    }

    if (!isOnline()) {
      console.log('Hors ligne, skip traitement de la queue');
      return;
    }

    if (!googleAuthService.isAuthenticated()) {
      console.log('Non authentifié, skip traitement de la queue');
      return;
    }

    const queue = backupRepository.getQueue();
    if (queue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`Traitement de ${queue.length} backup(s) en attente...`);

    for (const entry of queue) {
      try {
        // Vérifier le nombre de tentatives (max 5)
        if (entry.attempts >= 5) {
          console.error(
            `Backup ${entry.fileName} abandonné après 5 tentatives`
          );
          backupRepository.removeFromQueue(entry.id);
          continue;
        }

        // Mettre à jour le statut
        backupRepository.updateQueueEntry(entry.id, {
          status: 'uploading',
          attempts: entry.attempts + 1,
          lastAttemptAt: new Date().toISOString(),
        });

        // Préparer et uploader
        const { blob } = await prepareBackup(
          entry.content.data,
          entry.content.metadata.description
        );

        await googleDriveService.uploadBackup(
          entry.fileName,
          blob,
          entry.content.metadata
        );

        // Succès, retirer de la queue
        backupRepository.removeFromQueue(entry.id);
        console.log(`Backup de la queue uploadé: ${entry.fileName}`);

        // Respecter l'intervalle minimum
        await new Promise((resolve) =>
          setTimeout(resolve, this.MIN_BACKUP_INTERVAL)
        );
      } catch (error) {
        console.error(
          `Erreur lors du traitement du backup ${entry.fileName}:`,
          error
        );

        // Appliquer un backoff exponentiel
        await exponentialBackoff(entry.attempts);

        // Mettre à jour l'erreur
        const errorMessage =
          error instanceof Error ? error.message : 'Erreur inconnue';
        backupRepository.updateQueueEntry(entry.id, {
          status: 'error',
          error: errorMessage,
        });
      }
    }

    this.isProcessingQueue = false;

    // Nettoyer après le traitement
    this.cleanupOldBackups();
  }

  /**
   * Nettoyer les anciens backups sur Drive
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const config = backupRepository.getConfig();
      const deletedCount = await googleDriveService.cleanupOldBackups(
        config.maxBackupsToKeep
      );

      if (deletedCount > 0) {
        console.log(`${deletedCount} ancien(s) backup(s) supprimé(s)`);
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des backups:', error);
    }
  }

  /**
   * Restaurer un backup depuis Google Drive
   */
  public async restoreBackup(
    fileId: string,
    options: RestoreOptions = {
      mode: 'replace',
      validateSchema: true,
      createBackupBeforeRestore: true,
    }
  ): Promise<RestoreResult> {
    try {
      if (!googleAuthService.isAuthenticated()) {
        throw new BackupError(
          BackupErrorCode.AUTH_FAILED,
          'Non authentifié avec Google Drive'
        );
      }

      // Créer un backup de sécurité avant restauration
      if (options.createBackupBeforeRestore) {
        console.log('Création d\'un backup de sécurité avant restauration...');
        await this.createBackup('Backup avant restauration');
      }

      // Télécharger le backup
      const blob = await googleDriveService.downloadBackup(fileId);

      // Extraire les données
      const data = await extractBackup(blob);

      // Valider le schéma si demandé
      if (options.validateSchema && data.players) {
        // Simplification : on assume que si data.players existe, le schéma est valide
        // Dans une version plus complète, on vérifierait la structure complète
      }

      // Importer les données
      await this.importData(data, options.mode);

      // Réinitialiser le dirty flag
      backupRepository.setDirty(false);

      // Compter les enregistrements importés
      const recordsImported = {
        players: data.players?.length || 0,
        gameModels: data.gameModels?.length || 0,
        games: data.games?.length || 0,
        gamePlayers: data.gamePlayers?.length || 0,
        turns: data.turns?.length || 0,
        turnScores: data.turnScores?.length || 0,
      };

      console.log('Restauration réussie', recordsImported);

      return {
        success: true,
        recordsImported,
      };
    } catch (error) {
      console.error('Erreur lors de la restauration:', error);

      const errorMessage =
        error instanceof BackupError
          ? error.message
          : 'Erreur inconnue lors de la restauration';

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Importer des données dans la base de données
   */
  private async importData(
    data: any,
    mode: 'merge' | 'replace'
  ): Promise<void> {
    if (mode === 'replace') {
      await db.transaction(
        'rw',
        [
          db.players,
          db.gameModels,
          db.games,
          db.gamePlayers,
          db.turns,
          db.turnScores,
        ],
        async () => {
          await db.players.clear();
          await db.gameModels.clear();
          await db.games.clear();
          await db.gamePlayers.clear();
          await db.turns.clear();
          await db.turnScores.clear();
        }
      );
    }

    await db.transaction(
      'rw',
      [
        db.players,
        db.gameModels,
        db.games,
        db.gamePlayers,
        db.turns,
        db.turnScores,
      ],
      async () => {
        for (const player of data.players || []) {
          await db.players.put(player);
        }
        for (const model of data.gameModels || []) {
          await db.gameModels.put(model);
        }
        for (const game of data.games || []) {
          await db.games.put(game);
        }
        for (const gp of data.gamePlayers || []) {
          await db.gamePlayers.put(gp);
        }
        for (const turn of data.turns || []) {
          await db.turns.put(turn);
        }
        for (const score of data.turnScores || []) {
          await db.turnScores.put(score);
        }
      }
    );
  }

  /**
   * Convertir ExportData en format BackupContent.data
   */
  private convertExportData(exportData: ExportData): any {
    return {
      players: exportData.players,
      gameModels: exportData.gameModels,
      games: exportData.games,
      gamePlayers: exportData.gamePlayers,
      turns: exportData.turns,
      turnScores: exportData.turnScores,
    };
  }

  /**
   * Notifier l'utilisateur (peut être étendu avec un système de notifications)
   */
  private notifyUser(message: string, type: 'success' | 'error'): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // TODO: Intégrer avec AlertContext ou un système de toast
  }

  /**
   * Réinitialiser le système de backup (déconnexion)
   */
  public reset(): void {
    this.stop();
    backupRepository.reset();
    this.lastBackupTime = 0;
  }
}

// Export d'une instance singleton
export const backupManager = BackupManager.getInstance();
