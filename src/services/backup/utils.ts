/**
 * Utilitaires pour la compression, décompression et génération de hash
 */

import pako from 'pako';
import { BackupContent, BackupMetadata, BACKUP_SCHEMA_VERSION } from './types';
import packageJson from '../../../package.json';

/**
 * Générer un ID unique pour l'appareil
 * Stocké dans localStorage pour être persistant
 */
export function getDeviceId(): string {
  const DEVICE_ID_KEY = 'score_compte_device_id';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    // Générer un nouvel ID basé sur un UUID v4 simplifié
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Obtenir la version de l'application depuis package.json
 */
export function getAppVersion(): string {
  return packageJson.version;
}

/**
 * Générer un nom de fichier de backup selon la convention
 * Format: ScoreCompte_{deviceId}_{env}_backup_v{schemaVersion}_{JJMMAAAA-HHMMSS}.json.gz
 */
export function generateBackupFileName(): string {
  const deviceId = getDeviceId();
  const env = (import.meta as any).env?.MODE || 'production';
  const now = new Date();

  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const timestamp = `${day}${month}${year}-${hours}${minutes}${seconds}`;
  const schemaVersion = BACKUP_SCHEMA_VERSION.replace(/\./g, '_');

  return `ScoreCompte_${deviceId}_${env}_backup_v${schemaVersion}_${timestamp}.json.gz`;
}

/**
 * Compresser des données JSON avec gzip
 */
export function compressData(data: unknown): Uint8Array {
  const jsonString = JSON.stringify(data);
  const compressed = pako.gzip(jsonString);
  return compressed;
}

/**
 * Décompresser des données gzip en JSON
 */
export function decompressData<T = unknown>(compressed: Uint8Array): T {
  const decompressed = pako.ungzip(compressed, { to: 'string' });
  return JSON.parse(decompressed) as T;
}

/**
 * Générer un hash SHA-256 d'un buffer
 */
export async function generateHash(data: Uint8Array): Promise<string> {
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

/**
 * Créer les métadonnées pour un backup
 */
export async function createBackupMetadata(
  compressedData: Uint8Array,
  description?: string
): Promise<BackupMetadata> {
  const hash = await generateHash(compressedData);

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    appVersion: getAppVersion(),
    deviceId: getDeviceId(),
    environment: (import.meta as any).env?.MODE || 'production',
    timestamp: new Date().toISOString(),
    size: compressedData.byteLength,
    hash,
    compressed: true,
    description,
  };
}

/**
 * Préparer un backup complet (données + métadonnées + compression)
 */
export async function prepareBackup(
  data: BackupContent['data'],
  description?: string
): Promise<{ blob: Blob; metadata: BackupMetadata }> {
  // Créer l'objet de backup complet
  const backupContent: Omit<BackupContent, 'metadata'> = {
    data,
  };

  // Compresser les données
  const compressed = compressData(backupContent);

  // Générer les métadonnées
  const metadata = await createBackupMetadata(compressed, description);

  // Créer le blob final
  const buffer = compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength) as ArrayBuffer;
  const blob = new Blob([buffer], { type: 'application/gzip' });

  return { blob, metadata };
}

/**
 * Extraire et décompresser un backup depuis un Blob
 */
export async function extractBackup(blob: Blob): Promise<BackupContent['data']> {
  // Lire le blob en ArrayBuffer
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Décompresser
  const decompressed = decompressData<Omit<BackupContent, 'metadata'>>(
    uint8Array
  );

  return decompressed.data;
}

/**
 * Valider la compatibilité d'un schéma de backup
 */
export function isSchemaCompatible(backupSchemaVersion: string): boolean {
  // Pour l'instant, on accepte uniquement la version 1.0.0
  // À adapter si on change le schéma de données
  const [major, minor] = BACKUP_SCHEMA_VERSION.split('.');
  const [backupMajor, backupMinor] = backupSchemaVersion.split('.');

  // Compatible si même version majeure et mineure <= actuelle
  return backupMajor === major && parseInt(backupMinor) <= parseInt(minor);
}

/**
 * Formater la taille d'un fichier en format lisible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Formater une date relative (ex: "il y a 2 heures")
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Vérifier si le navigateur est en ligne
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Attendre un délai avec backoff exponentiel
 */
export async function exponentialBackoff(
  attempt: number,
  baseDelay: number = 2000
): Promise<void> {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), 32000);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Générer un ID unique pour une entrée de queue
 */
export function generateQueueId(): string {
  return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
