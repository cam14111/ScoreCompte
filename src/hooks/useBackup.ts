/**
 * Hooks React pour le système de sauvegarde Google Drive
 */

import { useState, useEffect, useCallback } from 'react';
import { googleAuthService } from '@/services/backup/GoogleAuthService';
import { googleDriveService } from '@/services/backup/GoogleDriveService';
import { backupManager } from '@/services/backup/BackupManager';
import { backupRepository } from '@/services/backup/BackupRepository';
import type {
  GoogleAuthState,
  BackupSystemState,
  DriveBackupFile,
  BackupResult,
  RestoreResult,
  RestoreOptions,
  BackupConfig,
} from '@/services/backup/types';

/**
 * Hook pour gérer l'authentification Google
 */
export function useGoogleAuth() {
  const [authState, setAuthState] = useState<GoogleAuthState>(
    googleAuthService.getAuthState()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthChange = (newState: GoogleAuthState) => {
      setAuthState(newState);
    };

    googleAuthService.addAuthStateListener(handleAuthChange);

    return () => {
      googleAuthService.removeAuthStateListener(handleAuthChange);
    };
  }, []);

  const signIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await googleAuthService.signIn();
      // Démarrer le système de backup après connexion
      backupRepository.updateConfig({ enabled: true });
      backupManager.start();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await googleAuthService.signOut();
      backupManager.reset();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de déconnexion';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    authState,
    isAuthenticated: authState.isAuthenticated,
    isLoading,
    error,
    signIn,
    signOut,
  };
}

/**
 * Hook pour gérer l'état du système de sauvegarde
 */
export function useBackupStatus() {
  const [state, setState] = useState<BackupSystemState>(
    backupRepository.getState()
  );

  useEffect(() => {
    const handleStateChange = (newState: BackupSystemState) => {
      setState(newState);
    };

    backupRepository.addStateListener(handleStateChange);

    return () => {
      backupRepository.removeStateListener(handleStateChange);
    };
  }, []);

  const updateConfig = useCallback((config: Partial<BackupConfig>) => {
    backupRepository.updateConfig(config);

    // Redémarrer le scheduler si la configuration change
    if (config.enabled !== undefined || config.autoBackupInterval !== undefined) {
      backupManager.stop();
      if (backupRepository.getConfig().enabled) {
        backupManager.start();
      }
    }
  }, []);

  const markDirty = useCallback(() => {
    backupManager.markDirty();
  }, []);

  return {
    state,
    config: state.config,
    lastBackup: state.lastBackup,
    isDirty: state.isDirty,
    isOnline: state.isOnline,
    queuedBackups: state.queuedBackups,
    updateConfig,
    markDirty,
  };
}

/**
 * Hook pour créer des backups manuels
 */
export function useCreateBackup() {
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<BackupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createBackup = useCallback(async (description?: string) => {
    setIsCreating(true);
    setError(null);
    setResult(null);

    try {
      const backupResult = await backupManager.createBackup(description);
      setResult(backupResult);
      return backupResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de sauvegarde';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    createBackup,
    isCreating,
    result,
    error,
  };
}

/**
 * Hook pour lister les backups sur Drive
 */
export function useListBackups() {
  const [backups, setBackups] = useState<DriveBackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBackups = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const files = await googleDriveService.listBackups();
      setBackups(files);
      return files;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(errorMessage);
      setBackups([]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteBackup = useCallback(async (fileId: string) => {
    try {
      await googleDriveService.deleteBackup(fileId);
      // Recharger la liste après suppression
      await loadBackups();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de suppression';
      throw new Error(errorMessage);
    }
  }, [loadBackups]);

  useEffect(() => {
    if (googleAuthService.isAuthenticated()) {
      loadBackups();
    }
  }, [loadBackups]);

  return {
    backups,
    isLoading,
    error,
    loadBackups,
    deleteBackup,
  };
}

/**
 * Hook pour restaurer un backup
 */
export function useRestoreBackup() {
  const [isRestoring, setIsRestoring] = useState(false);
  const [result, setResult] = useState<RestoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const restoreBackup = useCallback(
    async (fileId: string, options?: RestoreOptions) => {
      setIsRestoring(true);
      setError(null);
      setResult(null);

      try {
        const restoreResult = await backupManager.restoreBackup(fileId, options);
        setResult(restoreResult);
        return restoreResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur de restauration';
        setError(errorMessage);
        throw err;
      } finally {
        setIsRestoring(false);
      }
    },
    []
  );

  return {
    restoreBackup,
    isRestoring,
    result,
    error,
  };
}

/**
 * Hook pour initialiser le système de backup au démarrage de l'app
 */
export function useBackupInitialization() {
  useEffect(() => {
    const config = backupRepository.getConfig();

    if (config.enabled && googleAuthService.isAuthenticated()) {
      console.log('Initialisation du système de sauvegarde...');
      backupManager.start();
    }

    return () => {
      backupManager.stop();
    };
  }, []);
}
