/**
 * Repository pour gérer l'état local du système de sauvegarde
 * Utilise localStorage pour la persistance
 */

import {
  BackupConfig,
  BackupSystemState,
  BackupQueueEntry,
  BackupStatus,
} from './types';
import { googleAuthService } from './GoogleAuthService';
import { isOnline } from './utils';

const STORAGE_KEYS = {
  CONFIG: 'backup_config',
  LAST_BACKUP: 'backup_last_backup',
  IS_DIRTY: 'backup_is_dirty',
  QUEUE: 'backup_queue',
  DRIVE_FOLDER_ID: 'backup_drive_folder_id',
};

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG: BackupConfig = {
  enabled: false, // Désactivé par défaut jusqu'à la connexion
  autoBackupInterval: 30, // 30 minutes
  maxBackupsToKeep: 5,
  backupOnAppClose: true,
  backupOnCriticalActions: true,
  notifyOnSuccess: false, // Ne pas notifier à chaque succès
  notifyOnError: true,
};

export class BackupRepository {
  private static instance: BackupRepository;
  private listeners: Array<(state: BackupSystemState) => void> = [];

  private constructor() {
    // Initialiser la détection de connexion réseau
    window.addEventListener('online', () => this.notifyListeners());
    window.addEventListener('offline', () => this.notifyListeners());
  }

  /**
   * Singleton instance
   */
  public static getInstance(): BackupRepository {
    if (!BackupRepository.instance) {
      BackupRepository.instance = new BackupRepository();
    }
    return BackupRepository.instance;
  }

  /**
   * Ajouter un listener pour les changements d'état
   */
  public addStateListener(listener: (state: BackupSystemState) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Retirer un listener
   */
  public removeStateListener(
    listener: (state: BackupSystemState) => void
  ): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  /**
   * Notifier les listeners d'un changement d'état
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  /**
   * Obtenir la configuration
   */
  public getConfig(): BackupConfig {
    const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (stored) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      } catch {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  }

  /**
   * Mettre à jour la configuration
   */
  public updateConfig(config: Partial<BackupConfig>): void {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(updated));
    this.notifyListeners();
  }

  /**
   * Obtenir l'état du dernier backup
   */
  public getLastBackup(): BackupSystemState['lastBackup'] {
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fallback
      }
    }
    return {
      status: 'idle',
      timestamp: null,
      fileName: null,
      error: null,
    };
  }

  /**
   * Mettre à jour l'état du dernier backup
   */
  public updateLastBackup(
    status: BackupStatus,
    fileName: string | null = null,
    error: string | null = null
  ): void {
    const lastBackup = {
      status,
      timestamp: new Date().toISOString(),
      fileName,
      error,
    };
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, JSON.stringify(lastBackup));
    this.notifyListeners();
  }

  /**
   * Obtenir le flag dirty
   */
  public isDirty(): boolean {
    return localStorage.getItem(STORAGE_KEYS.IS_DIRTY) === 'true';
  }

  /**
   * Définir le flag dirty
   */
  public setDirty(dirty: boolean): void {
    localStorage.setItem(STORAGE_KEYS.IS_DIRTY, dirty.toString());
    this.notifyListeners();
  }

  /**
   * Obtenir la queue des backups
   */
  public getQueue(): BackupQueueEntry[] {
    const stored = localStorage.getItem(STORAGE_KEYS.QUEUE);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Ajouter un backup à la queue
   */
  public addToQueue(entry: BackupQueueEntry): void {
    const queue = this.getQueue();
    queue.push(entry);
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
    this.notifyListeners();
  }

  /**
   * Mettre à jour une entrée de la queue
   */
  public updateQueueEntry(
    id: string,
    updates: Partial<BackupQueueEntry>
  ): void {
    const queue = this.getQueue();
    const index = queue.findIndex((entry) => entry.id === id);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
      this.notifyListeners();
    }
  }

  /**
   * Retirer une entrée de la queue
   */
  public removeFromQueue(id: string): void {
    const queue = this.getQueue();
    const filtered = queue.filter((entry) => entry.id !== id);
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(filtered));
    this.notifyListeners();
  }

  /**
   * Vider la queue
   */
  public clearQueue(): void {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify([]));
    this.notifyListeners();
  }

  /**
   * Obtenir l'ID du dossier Drive
   */
  public getDriveFolderId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.DRIVE_FOLDER_ID);
  }

  /**
   * Définir l'ID du dossier Drive
   */
  public setDriveFolderId(folderId: string): void {
    localStorage.setItem(STORAGE_KEYS.DRIVE_FOLDER_ID, folderId);
    this.notifyListeners();
  }

  /**
   * Obtenir l'état complet du système
   */
  public getState(): BackupSystemState {
    return {
      config: this.getConfig(),
      authState: googleAuthService.getAuthState(),
      lastBackup: this.getLastBackup(),
      isDirty: this.isDirty(),
      queuedBackups: this.getQueue(),
      isOnline: isOnline(),
      driveFolderId: this.getDriveFolderId(),
    };
  }

  /**
   * Réinitialiser tout l'état (utile pour déconnexion)
   */
  public reset(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    this.notifyListeners();
  }
}

// Export d'une instance singleton
export const backupRepository = BackupRepository.getInstance();
