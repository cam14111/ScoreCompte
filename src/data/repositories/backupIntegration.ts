/**
 * Intégration du système de backup avec les repositories
 * Permet de marquer les données comme modifiées pour déclencher les backups automatiques
 */

import { backupManager } from '@/services/backup/BackupManager';

/**
 * Marquer les données comme modifiées (dirty flag)
 * Appeler cette fonction après toute modification de données (create, update, delete)
 */
export function markDataDirty(): void {
  try {
    backupManager.markDirty();
  } catch (error) {
    // Ne pas bloquer l'application si le backup manager n'est pas initialisé
    console.warn('Backup manager non disponible:', error);
  }
}
