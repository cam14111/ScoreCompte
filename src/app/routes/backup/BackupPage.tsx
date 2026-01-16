import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import {
  Cloud,
  CloudOff,
  Upload,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import {
  useGoogleAuth,
  useBackupStatus,
  useCreateBackup,
  useListBackups,
  useRestoreBackup,
} from '@/hooks/useBackup';
import { formatFileSize, formatRelativeTime } from '@/services/backup/utils';
import { useAlertDialog } from '@/contexts/AlertContext';

export function BackupPage() {
  const { showAlert } = useAlertDialog();
  const {
    isAuthenticated,
    authState,
    isLoading: authLoading,
    signIn,
    signOut,
  } = useGoogleAuth();

  const { config, lastBackup, isDirty, isOnline, queuedBackups, updateConfig } =
    useBackupStatus();

  const { createBackup, isCreating } = useCreateBackup();
  const { backups, isLoading: backupsLoading, loadBackups, deleteBackup } =
    useListBackups();
  const { restoreBackup, isRestoring } = useRestoreBackup();

  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('replace');

  const handleSignIn = async () => {
    try {
      await signIn();
      showAlert({
        title: 'Connexion réussie',
        message: `Connecté en tant que ${authState.userEmail}`,
        type: 'success',
      });
    } catch (error) {
      showAlert({
        title: 'Erreur de connexion',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        type: 'error',
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      showAlert({
        title: 'Déconnexion réussie',
        message: 'Vous êtes maintenant déconnecté de Google Drive',
        type: 'success',
      });
    } catch (error) {
      showAlert({
        title: 'Erreur de déconnexion',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        type: 'error',
      });
    }
  };

  const handleCreateBackup = async () => {
    try {
      const result = await createBackup();
      if (result.success) {
        showAlert({
          title: 'Sauvegarde réussie',
          message: `Backup créé: ${result.fileName}`,
          type: 'success',
        });
        await loadBackups();
      }
    } catch (error) {
      showAlert({
        title: 'Erreur de sauvegarde',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        type: 'error',
      });
    }
  };

  const handleRestore = async (fileId: string, fileName: string) => {
    try {
      const confirmed = window.confirm(
        `Voulez-vous restaurer le backup "${fileName}" ?\n\nMode: ${
          restoreMode === 'replace' ? 'Remplacement (tout effacer)' : 'Fusion'
        }\n\nUn backup de sécurité sera créé avant.`
      );

      if (!confirmed) return;

      const result = await restoreBackup(fileId, {
        mode: restoreMode,
        validateSchema: true,
        createBackupBeforeRestore: true,
      });

      if (result.success) {
        showAlert({
          title: 'Restauration réussie',
          message: `Backup restauré avec succès.\n${
            result.recordsImported
              ? `${result.recordsImported.games} parties, ${result.recordsImported.players} joueurs importés.`
              : ''
          }`,
          type: 'success',
        });
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
    } catch (error) {
      showAlert({
        title: 'Erreur de restauration',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        type: 'error',
      });
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    try {
      const confirmed = window.confirm(
        `Voulez-vous vraiment supprimer le backup "${fileName}" ?`
      );

      if (!confirmed) return;

      await deleteBackup(fileId);
      showAlert({
        title: 'Suppression réussie',
        message: 'Backup supprimé',
        type: 'success',
      });
    } catch (error) {
      showAlert({
        title: 'Erreur de suppression',
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        type: 'error',
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sauvegarde Google Drive</h1>
        <p className="text-sm text-muted-foreground">
          Sauvegardez automatiquement vos données sur Google Drive
        </p>
      </div>

      {/* Statut connexion réseau */}
      {!isOnline && (
        <Card className="border-orange-500/50 bg-orange-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CloudOff className="h-5 w-5 text-orange-500" />
              <p className="text-sm">
                Vous êtes hors ligne. Les backups seront mis en attente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue des backups */}
      {queuedBackups.length > 0 && (
        <Card className="border-blue-500/50 bg-blue-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-blue-500" />
              <p className="text-sm">
                {queuedBackups.length} backup(s) en attente d'upload
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connexion Google */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Connexion Google Drive
          </CardTitle>
          <CardDescription>
            Connectez-vous avec votre compte Google pour activer la sauvegarde
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAuthenticated ? (
            <>
              <div className="p-4 border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  La sauvegarde automatique nécessite une connexion à Google Drive.
                  Vos données seront stockées dans un dossier "Score_Compte".
                </p>
              </div>
              <Button
                onClick={handleSignIn}
                disabled={authLoading}
                className="w-full"
              >
                {authLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Cloud className="h-4 w-4 mr-2" />
                )}
                Se connecter à Google
              </Button>
            </>
          ) : (
            <>
              <div className="p-4 border rounded-lg bg-green-500/10 border-green-500/50">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Connecté</p>
                    <p className="text-sm text-muted-foreground">
                      {authState.userEmail}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full"
              >
                Se déconnecter
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Configuration sauvegarde automatique */}
      {isAuthenticated && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Paramètres de la sauvegarde automatique
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Sauvegarde automatique</Label>
                <p className="text-xs text-muted-foreground">
                  Sauvegarder automatiquement les changements
                </p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(enabled) => updateConfig({ enabled })}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Sauvegarde à la fermeture</Label>
                <p className="text-xs text-muted-foreground">
                  Créer un backup lors de la fermeture de l'app
                </p>
              </div>
              <Switch
                checked={config.backupOnAppClose}
                onCheckedChange={(backupOnAppClose) =>
                  updateConfig({ backupOnAppClose })
                }
              />
            </div>

            <div className="p-3 border rounded-lg space-y-2">
              <Label>Intervalle de sauvegarde</Label>
              <p className="text-xs text-muted-foreground">
                Fréquence des sauvegardes automatiques
              </p>
              <select
                value={config.autoBackupInterval}
                onChange={(e) =>
                  updateConfig({ autoBackupInterval: Number(e.target.value) })
                }
                className="w-full p-2 border rounded bg-background text-foreground"
              >
                <option value={15}>Toutes les 15 minutes</option>
                <option value={30}>Toutes les 30 minutes</option>
                <option value={60}>Toutes les heures</option>
                <option value={120}>Toutes les 2 heures</option>
              </select>
            </div>

            <div className="p-3 border rounded-lg space-y-2">
              <Label>Nombre de backups à conserver</Label>
              <p className="text-xs text-muted-foreground">
                Les backups les plus anciens seront supprimés
              </p>
              <select
                value={config.maxBackupsToKeep}
                onChange={(e) =>
                  updateConfig({ maxBackupsToKeep: Number(e.target.value) })
                }
                className="w-full p-2 border rounded bg-background text-foreground"
              >
                <option value={3}>3 backups</option>
                <option value={5}>5 backups</option>
                <option value={10}>10 backups</option>
                <option value={20}>20 backups</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statut du dernier backup */}
      {isAuthenticated && lastBackup.timestamp && (
        <Card>
          <CardHeader>
            <CardTitle>Dernier backup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                <div className="flex items-center gap-2">
                  {lastBackup.status === 'success' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {lastBackup.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">
                    {lastBackup.status === 'success' && 'Réussi'}
                    {lastBackup.status === 'error' && 'Échec'}
                    {lastBackup.status === 'uploading' && 'En cours...'}
                    {lastBackup.status === 'offline_queued' && 'En attente'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="text-sm">
                  {formatRelativeTime(lastBackup.timestamp)}
                </span>
              </div>
              {lastBackup.fileName && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fichier</span>
                  <span className="text-xs font-mono truncate max-w-[200px]">
                    {lastBackup.fileName}
                  </span>
                </div>
              )}
              {lastBackup.error && (
                <div className="p-2 rounded bg-red-500/10 border border-red-500/50">
                  <p className="text-xs text-red-500">{lastBackup.error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sauvegarde manuelle */}
      {isAuthenticated && (
        <Card>
          <CardHeader>
            <CardTitle>Sauvegarde manuelle</CardTitle>
            <CardDescription>
              Créer un backup immédiatement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDirty && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/50 rounded-lg">
                <p className="text-sm text-orange-500">
                  ⚠️ Vous avez des changements non sauvegardés
                </p>
              </div>
            )}
            <Button
              onClick={handleCreateBackup}
              disabled={isCreating || !isOnline}
              className="w-full"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isCreating ? 'Sauvegarde en cours...' : 'Sauvegarder maintenant'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Liste des backups */}
      {isAuthenticated && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mes backups</CardTitle>
                <CardDescription>
                  Liste des sauvegardes sur Google Drive
                </CardDescription>
              </div>
              <Button
                onClick={loadBackups}
                disabled={backupsLoading}
                variant="outline"
                size="sm"
              >
                <RefreshCw
                  className={`h-4 w-4 ${backupsLoading ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode de restauration */}
            <div className="border rounded-lg p-3 space-y-2">
              <Label>Mode de restauration</Label>
              <div className="space-y-2">
                <button
                  className={`w-full p-2 border rounded text-left text-sm transition-colors ${
                    restoreMode === 'replace'
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => setRestoreMode('replace')}
                >
                  <div className="font-medium text-destructive">Remplacement</div>
                  <div className="text-xs text-muted-foreground">
                    Efface toutes les données actuelles
                  </div>
                </button>
                <button
                  className={`w-full p-2 border rounded text-left text-sm transition-colors ${
                    restoreMode === 'merge'
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => setRestoreMode('merge')}
                >
                  <div className="font-medium">Fusion</div>
                  <div className="text-xs text-muted-foreground">
                    Ajoute aux données existantes
                  </div>
                </button>
              </div>
            </div>

            {backupsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Aucun backup trouvé</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {backup.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(backup.createdTime)} •{' '}
                          {formatFileSize(backup.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRestore(backup.id, backup.name)}
                        disabled={isRestoring || !isOnline}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Restaurer
                      </Button>
                      <Button
                        onClick={() => handleDelete(backup.id, backup.name)}
                        disabled={isRestoring}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Comment ça marche ?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Sauvegarde automatique :</strong> Vos données sont
            automatiquement sauvegardées sur Google Drive selon l'intervalle
            configuré.
          </p>
          <p>
            <strong>Hors ligne :</strong> Si vous êtes hors ligne, les backups
            sont mis en attente et seront uploadés automatiquement lors de la
            prochaine connexion.
          </p>
          <p>
            <strong>Sécurité :</strong> Les backups sont compressés et stockés
            dans un dossier "Score_Compte" sur votre Google Drive. Seule votre
            application y a accès.
          </p>
          <p>
            <strong>Multi-appareils :</strong> Vous pouvez restaurer vos
            données sur n'importe quel appareil en vous connectant avec le même
            compte Google.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
