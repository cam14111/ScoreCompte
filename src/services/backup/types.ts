/**
 * Types pour le système de sauvegarde Google Drive
 */

// Version du schéma de sauvegarde
export const BACKUP_SCHEMA_VERSION = '1.0.0';

// Scope OAuth Google Drive (restrictif - accès aux fichiers créés par l'app uniquement)
export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // Accès aux fichiers créés par l'app uniquement
];

// Scope alternatif si besoin d'accès complet au dossier (moins restrictif)
export const GOOGLE_DRIVE_SCOPES_APPFOLDER = [
  'https://www.googleapis.com/auth/drive.appdata', // Dossier appdata caché
];

/**
 * Métadonnées d'un backup
 */
export interface BackupMetadata {
  schemaVersion: string; // Version du schéma de données
  appVersion: string; // Version de l'application
  deviceId: string; // ID unique de l'appareil
  environment: string; // 'production' | 'development'
  timestamp: string; // ISO 8601 timestamp
  size: number; // Taille du fichier en bytes
  hash: string; // SHA-256 hash pour intégrité
  compressed: boolean; // Si le backup est compressé (gzip)
  description?: string; // Description optionnelle
}

/**
 * Contenu d'un backup (données exportées)
 */
export interface BackupContent {
  metadata: BackupMetadata;
  data: {
    players: unknown[];
    gameModels: unknown[];
    games: unknown[];
    gamePlayers: unknown[];
    turns: unknown[];
    turnScores: unknown[];
    settings?: unknown; // Optionnel
  };
}

/**
 * Information d'un fichier de backup sur Google Drive
 */
export interface DriveBackupFile {
  id: string; // ID du fichier sur Google Drive
  name: string; // Nom du fichier
  createdTime: string; // Date de création (ISO 8601)
  modifiedTime: string; // Date de modification (ISO 8601)
  size: number; // Taille en bytes
  metadata?: BackupMetadata; // Métadonnées extraites (si disponibles)
}

/**
 * État de l'authentification Google
 */
export interface GoogleAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  expiresAt: number | null; // Timestamp d'expiration
  userEmail: string | null;
  userName: string | null;
}

/**
 * Configuration de la sauvegarde automatique
 */
export interface BackupConfig {
  enabled: boolean; // Activer/désactiver la sauvegarde auto
  autoBackupInterval: number; // Intervalle en minutes (par défaut: 30)
  maxBackupsToKeep: number; // Nombre de backups à conserver (par défaut: 5)
  backupOnAppClose: boolean; // Sauvegarder à la fermeture
  backupOnCriticalActions: boolean; // Sauvegarder après actions critiques
  notifyOnSuccess: boolean; // Notifier l'utilisateur en cas de succès
  notifyOnError: boolean; // Notifier l'utilisateur en cas d'erreur
}

/**
 * État d'une opération de sauvegarde
 */
export type BackupStatus =
  | 'idle'
  | 'pending'
  | 'uploading'
  | 'success'
  | 'error'
  | 'offline_queued';

/**
 * Entrée dans la queue de sauvegarde (pour gestion offline)
 */
export interface BackupQueueEntry {
  id: string; // ID unique de l'entrée
  content: BackupContent; // Contenu à sauvegarder
  fileName: string; // Nom du fichier cible
  attempts: number; // Nombre de tentatives
  status: BackupStatus;
  createdAt: string; // Timestamp de création
  lastAttemptAt?: string; // Timestamp de la dernière tentative
  error?: string; // Message d'erreur si échec
}

/**
 * État global du système de sauvegarde
 */
export interface BackupSystemState {
  config: BackupConfig;
  authState: GoogleAuthState;
  lastBackup: {
    status: BackupStatus;
    timestamp: string | null;
    fileName: string | null;
    error: string | null;
  };
  isDirty: boolean; // Flag indiquant si des changements non sauvegardés existent
  queuedBackups: BackupQueueEntry[]; // Queue des backups en attente
  isOnline: boolean; // État de la connexion réseau
  driveFolderId: string | null; // ID du dossier "Score_Compte" sur Drive
}

/**
 * Options pour la restauration d'un backup
 */
export interface RestoreOptions {
  mode: 'merge' | 'replace'; // Fusionner ou remplacer les données existantes
  validateSchema: boolean; // Valider la compatibilité du schéma
  createBackupBeforeRestore: boolean; // Créer un backup de sécurité avant
}

/**
 * Résultat d'une opération de sauvegarde
 */
export interface BackupResult {
  success: boolean;
  fileName?: string;
  fileId?: string;
  size?: number;
  error?: string;
  timestamp: string;
}

/**
 * Résultat d'une opération de restauration
 */
export interface RestoreResult {
  success: boolean;
  recordsImported?: {
    players: number;
    gameModels: number;
    games: number;
    gamePlayers: number;
    turns: number;
    turnScores: number;
  };
  error?: string;
  backupMetadata?: BackupMetadata;
}

/**
 * Détection de conflit entre backups
 */
export interface BackupConflict {
  localBackup: DriveBackupFile;
  remoteBackup: DriveBackupFile;
  reason: 'timestamp_mismatch' | 'device_mismatch' | 'hash_mismatch';
  suggestedResolution: 'use_local' | 'use_remote' | 'manual_review';
}

/**
 * Erreurs spécifiques au système de sauvegarde
 */
export enum BackupErrorCode {
  AUTH_FAILED = 'AUTH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  FOLDER_NOT_FOUND = 'FOLDER_NOT_FOUND',
  INVALID_BACKUP = 'INVALID_BACKUP',
  SCHEMA_INCOMPATIBLE = 'SCHEMA_INCOMPATIBLE',
  COMPRESSION_FAILED = 'COMPRESSION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Erreur de sauvegarde typée
 */
export class BackupError extends Error {
  constructor(
    public code: BackupErrorCode,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'BackupError';
  }
}
