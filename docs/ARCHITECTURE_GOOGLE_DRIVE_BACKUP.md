# Architecture - Sauvegarde Google Drive pour ScoreCompte

**Version** : 1.0
**Date** : 2026-01-12
**Auteur** : Plan d'architecture

---

## Table des matières

1. [Contexte et analyse existante](#1-contexte-et-analyse-existante)
2. [Approches possibles](#2-approches-possibles)
3. [Flux complet](#3-flux-complet)
4. [Décisions techniques](#4-décisions-techniques)
5. [Backlog (User Stories)](#5-backlog-user-stories)
6. [Plan de livraison](#6-plan-de-livraison)

---

## 1. Contexte et analyse existante

### 1.1 Stack technique actuelle

| Composant | Technologie |
|-----------|-------------|
| Framework | React 18.3 + TypeScript 5.7 |
| Build | Vite 5.4 |
| Base de données | Dexie 4.0 (IndexedDB) |
| PWA | vite-plugin-pwa + Workbox |
| UI | Tailwind CSS + Lucide Icons |

### 1.2 Données stockées (6 tables Dexie)

```
┌─────────────────────────────────────────────────────────────┐
│                    ScoreCounterDB                           │
├─────────────────────────────────────────────────────────────┤
│  players        │ ~50 entrées max, avatars base64 (≤500KB)  │
│  gameModels     │ ~20 entrées (7 prédéfinis + custom)       │
│  games          │ Illimité, ~100-500 parties typiques       │
│  gamePlayers    │ Relation M2M (2-8 par partie)             │
│  turns          │ ~10-50 tours par partie                   │
│  turnScores     │ 1 score/joueur/tour                       │
└─────────────────────────────────────────────────────────────┘
```

**Estimation taille totale** : 500KB - 5MB (selon avatars et historique)

### 1.3 Export/Import existant

L'application dispose déjà d'un système d'export/import JSON (`/src/lib/exportImport.ts`) :

```typescript
interface ExportData {
  version: '1.0.0';
  exportedAt: number;
  players: Player[];
  gameModels: GameModel[];
  games: Game[];
  gamePlayers: GamePlayer[];
  turns: Turn[];
  turnScores: TurnScore[];
}
```

**Point clé** : Ce format servira de base pour les sauvegardes Drive.

---

## 2. Approches possibles

### 2.1 Approche A : 100% côté client (PWA + OAuth Google)

```
┌──────────────────┐         ┌──────────────────┐
│   PWA Client     │ ──────► │   Google APIs    │
│  (ScoreCompte)   │ OAuth2  │   (Drive API)    │
│                  │ ◄────── │                  │
└──────────────────┘ Tokens  └──────────────────┘
```

#### Fonctionnement

1. L'utilisateur clique "Connecter Google Drive"
2. Popup OAuth Google (consent screen)
3. Google renvoie un `access_token` directement au client (Implicit Flow ou PKCE)
4. Le client appelle l'API Drive directement avec ce token
5. Tokens stockés localement (IndexedDB ou localStorage)

#### Avantages

| Avantage | Détail |
|----------|--------|
| **Simplicité d'hébergement** | Pas de serveur à maintenir, GitHub Pages suffit |
| **Coût zéro** | Aucune infrastructure backend |
| **Latence faible** | Communication directe client ↔ Google |
| **Privacy by design** | Données jamais transitées par un tiers |
| **Offline-first natif** | S'intègre bien à l'architecture PWA existante |

#### Inconvénients

| Inconvénient | Détail | Mitigation |
|--------------|--------|------------|
| **Client ID exposé** | Visible dans le JS bundle | Pas un secret, restrictions via Google Console |
| **Token refresh complexe** | Pas de refresh_token en implicit flow | Utiliser PKCE (Authorization Code + PKCE) |
| **Limites Google API** | 10,000 requêtes/jour/projet | Largement suffisant pour usage personnel |
| **Gestion token expiration** | Access token expire (1h) | Refresh silencieux via iframe ou re-auth |
| **CORS possible** | Certains endpoints peuvent bloquer | Google APIs supportent CORS |

#### Complexité : ⭐⭐ Moyenne

#### Contraintes

- Nécessite une "OAuth consent screen" vérifiée pour usage public (ou mode test)
- Client ID configuré avec origines autorisées (HTTPS obligatoire)
- Scope Google Drive limité au dossier app

---

### 2.2 Approche B : Avec backend (proxy/token manager)

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   PWA Client     │ ──────► │   Backend        │ ──────► │   Google APIs    │
│  (ScoreCompte)   │         │  (Supabase/Node) │         │   (Drive API)    │
│                  │ ◄────── │                  │ ◄────── │                  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

#### Fonctionnement

1. L'utilisateur clique "Connecter Google Drive"
2. Redirection vers backend qui initie OAuth
3. Backend récupère les tokens (access + refresh)
4. Backend stocke le refresh_token côté serveur (sécurisé)
5. Client demande au backend de faire les opérations Drive
6. Backend refresh le token si nécessaire et exécute les requêtes

#### Avantages

| Avantage | Détail |
|----------|--------|
| **Refresh token sécurisé** | Jamais exposé côté client |
| **Client secret protégé** | Stocké uniquement sur le serveur |
| **Logique métier centralisée** | Validation, rate limiting, logs côté serveur |
| **Évolutivité** | Facile d'ajouter d'autres providers (Dropbox, OneDrive) |

#### Inconvénients

| Inconvénient | Détail | Mitigation |
|--------------|--------|------------|
| **Coût infrastructure** | Serveur à maintenir | Supabase gratuit jusqu'à 500MB |
| **Point de défaillance** | Si backend down, pas de sync | Queue locale + retry |
| **Latence additionnelle** | Client → Backend → Google | Acceptable pour backup |
| **Complexité déploiement** | CI/CD backend + monitoring | Supabase Edge Functions simplifient |
| **Privacy** | Données transitent par le backend | Peut chiffrer côté client avant envoi |

#### Complexité : ⭐⭐⭐ Élevée

#### Contraintes

- Nécessite un compte Supabase/Vercel/autre
- Gestion des secrets (env variables)
- HTTPS obligatoire
- Logs et monitoring recommandés

---

### 2.3 Décision recommandée : **Approche A (100% client)**

| Critère | Approche A | Approche B |
|---------|------------|------------|
| Complexité | ⭐⭐ | ⭐⭐⭐ |
| Coût | 0€ | Variable |
| Maintenance | Faible | Moyenne |
| Privacy | ✅ Excellente | ⚠️ Données transitent |
| Offline | ✅ Natif | ⚠️ Dégradé |
| Évolutivité | ⚠️ Limitée | ✅ Bonne |

**Justification** :
1. L'app est déjà 100% client-side (GitHub Pages)
2. Le use case est personnel/familial (pas de multi-utilisateurs massif)
3. La privacy est préservée (aucune donnée ne transite par un tiers)
4. PKCE permet une gestion sécurisée des tokens sans backend
5. Cohérent avec la philosophie PWA offline-first

---

## 3. Flux complet

### 3.1 Connexion Google OAuth

#### Quand déclencher la connexion ?

| Déclencheur | Comportement |
|-------------|--------------|
| Premier accès page "Sauvegarde" | Proposer connexion (non bloquant) |
| Clic "Activer la sauvegarde" | Déclencher OAuth |
| Tentative de restore | Rediriger vers connexion si non connecté |
| Token expiré | Refresh silencieux ou re-demander |

#### Flow OAuth PKCE (recommandé)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           OAuth 2.0 PKCE Flow                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Génération PKCE                                                         │
│     ┌────────────┐                                                          │
│     │   Client   │ → Génère code_verifier (random 43-128 chars)             │
│     │            │ → Calcule code_challenge = SHA256(code_verifier)         │
│     └────────────┘                                                          │
│                                                                             │
│  2. Redirection Authorization                                               │
│     ┌────────────┐         ┌────────────────────┐                           │
│     │   Client   │ ──────► │ accounts.google.com│                           │
│     │            │         │ /o/oauth2/v2/auth  │                           │
│     └────────────┘         └────────────────────┘                           │
│     Params: client_id, redirect_uri, scope, response_type=code,             │
│             code_challenge, code_challenge_method=S256                      │
│                                                                             │
│  3. Consentement utilisateur (popup Google)                                 │
│     └── L'utilisateur autorise l'accès au dossier Drive                     │
│                                                                             │
│  4. Callback avec authorization code                                        │
│     ┌────────────────────┐         ┌────────────┐                           │
│     │ accounts.google.com│ ──────► │   Client   │                           │
│     │                    │         │ (redirect) │                           │
│     └────────────────────┘         └────────────┘                           │
│     Params: code (authorization code)                                       │
│                                                                             │
│  5. Échange code → tokens                                                   │
│     ┌────────────┐         ┌────────────────────┐                           │
│     │   Client   │ ──────► │ oauth2.googleapis  │                           │
│     │            │ POST    │ .com/token         │                           │
│     └────────────┘         └────────────────────┘                           │
│     Body: code, code_verifier, client_id, redirect_uri, grant_type          │
│     Response: { access_token, refresh_token, expires_in }                   │
│                                                                             │
│  6. Stockage sécurisé des tokens                                            │
│     └── IndexedDB (table dédiée, jamais localStorage pour refresh_token)    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Permissions minimales (Scopes)

```
# RECOMMANDÉ (scope restrictif - app folder only)
https://www.googleapis.com/auth/drive.appdata

# OU (si besoin d'un dossier visible par l'utilisateur)
https://www.googleapis.com/auth/drive.file
```

| Scope | Accès | Recommandation |
|-------|-------|----------------|
| `drive.appdata` | Dossier caché "appDataFolder" uniquement | ✅ **Par défaut** - Invisible pour l'utilisateur |
| `drive.file` | Fichiers créés par l'app uniquement | ⚠️ Alternative - Dossier visible "ScoreCompte" |
| `drive` | Accès complet au Drive | ❌ **Jamais** - Trop large |

**Choix par défaut** : `drive.appdata` (le plus restrictif)

**Alternative** : `drive.file` si l'utilisateur veut voir/gérer ses backups manuellement

---

### 3.2 Création/gestion du dossier de sauvegarde

#### Option A : `appDataFolder` (recommandé)

```typescript
// Dossier spécial caché, accessible uniquement par l'app
const APP_FOLDER = 'appDataFolder'; // Constante Google

// Création d'un fichier dans appDataFolder
await gapi.client.drive.files.create({
  resource: {
    name: 'backup_2026-01-12T10-30-00.json.gz',
    parents: [APP_FOLDER]
  },
  media: {
    mimeType: 'application/gzip',
    body: compressedData
  }
});
```

**Avantages** :
- Invisible dans l'interface Drive utilisateur
- Pas de pollution visuelle
- Scope minimal (`drive.appdata`)

**Inconvénients** :
- L'utilisateur ne peut pas voir/télécharger ses backups manuellement
- Supprimé si l'utilisateur révoque l'accès de l'app

#### Option B : Dossier visible "ScoreCompte"

```typescript
// 1. Chercher le dossier existant
const response = await gapi.client.drive.files.list({
  q: "name='ScoreCompte' and mimeType='application/vnd.google-apps.folder' and trashed=false",
  spaces: 'drive',
  fields: 'files(id, name)'
});

// 2. Créer si inexistant
if (response.result.files.length === 0) {
  await gapi.client.drive.files.create({
    resource: {
      name: 'ScoreCompte',
      mimeType: 'application/vnd.google-apps.folder'
    }
  });
}
```

**Choix final** : `appDataFolder` par défaut, avec option utilisateur pour basculer vers dossier visible.

---

### 3.3 Format de sauvegarde

#### Structure du fichier backup

```typescript
interface DriveBackup {
  // Métadonnées
  meta: {
    version: string;          // "1.0.0" - Version du format backup
    appVersion: string;       // "1.7.1" - Version de ScoreCompte
    schemaVersion: number;    // 2 - Version Dexie schema
    createdAt: number;        // Timestamp création
    deviceId: string;         // UUID unique de l'appareil (généré au 1er lancement)
    deviceName?: string;      // "iPhone de Jean" (optionnel)
    checksum: string;         // SHA256 du payload pour intégrité
  };

  // Données (reprend ExportData existant)
  data: {
    players: Player[];
    gameModels: GameModel[];  // Exclut isPredefined=true sauf si modifiés
    games: Game[];
    gamePlayers: GamePlayer[];
    turns: Turn[];
    turnScores: TurnScore[];
  };

  // Stats rapides (pour aperçu sans charger tout)
  stats: {
    playersCount: number;
    gamesCount: number;
    totalSize: number;        // Taille décompressée en bytes
  };
}
```

#### Compression

```typescript
// Utiliser CompressionStream API (natif navigateur moderne)
async function compressBackup(backup: DriveBackup): Promise<Blob> {
  const json = JSON.stringify(backup);
  const stream = new Blob([json]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  return new Response(compressedStream).blob();
}

async function decompressBackup(blob: Blob): Promise<DriveBackup> {
  const stream = blob.stream();
  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
  const text = await new Response(decompressedStream).text();
  return JSON.parse(text);
}
```

**Ratio de compression estimé** : 70-85% (JSON très compressible)

#### Stratégie de nommage

```
backup_{timestamp}_{deviceId-short}.json.gz

Exemples:
- backup_2026-01-12T10-30-00Z_a1b2c3.json.gz
- backup_2026-01-12T15-45-22Z_a1b2c3.json.gz
```

| Composant | Format | Exemple |
|-----------|--------|---------|
| Préfixe | `backup_` | `backup_` |
| Timestamp | ISO 8601 (sans :) | `2026-01-12T10-30-00Z` |
| Device ID | 6 premiers chars | `a1b2c3` |
| Extension | `.json.gz` | `.json.gz` |

---

### 3.4 Détection de changements et fréquence

#### Dirty flag pattern

```typescript
// Nouvelle table Dexie pour métadonnées sync
interface SyncMeta {
  id: 'sync';                    // Singleton
  lastSyncAt: number | null;     // Dernier backup réussi
  isDirty: boolean;              // Données modifiées depuis dernier sync
  lastModifiedAt: number;        // Timestamp dernière modification locale
  pendingChangesCount: number;   // Nombre de modifications en attente
}

// Hook Dexie pour marquer dirty à chaque modification
db.tables.forEach(table => {
  table.hook('creating', () => markDirty());
  table.hook('updating', () => markDirty());
  table.hook('deleting', () => markDirty());
});

function markDirty() {
  db.syncMeta.update('sync', {
    isDirty: true,
    lastModifiedAt: Date.now(),
    pendingChangesCount: db.syncMeta.get('sync').pendingChangesCount + 1
  });
}
```

#### Stratégie de sync (quand sauvegarder ?)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Stratégie de synchronisation                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DÉCLENCHEURS AUTOMATIQUES                                                  │
│  ─────────────────────────────                                              │
│  1. Après action importante (debounce 30s)                                  │
│     - Fin de partie (game.status = 'FINISHED')                              │
│     - Création/suppression de joueur                                        │
│     - Création/modification de modèle                                       │
│                                                                             │
│  2. Intervalle régulier (si dirty)                                          │
│     - Toutes les 5 minutes si app active ET isDirty=true                    │
│     - Utilise requestIdleCallback pour ne pas bloquer l'UI                  │
│                                                                             │
│  3. À la fermeture (best effort)                                            │
│     - visibilitychange → 'hidden'                                           │
│     - beforeunload (non garanti sur mobile)                                 │
│     - Beacon API pour envoyer les dernières modifs                          │
│                                                                             │
│  4. À la réouverture                                                        │
│     - visibilitychange → 'visible' après >1h d'inactivité                   │
│     - Sync si dirty                                                         │
│                                                                             │
│  DÉCLENCHEURS MANUELS                                                       │
│  ─────────────────────                                                      │
│  - Bouton "Sauvegarder maintenant"                                          │
│  - Pull-to-refresh sur l'écran Sauvegarde                                   │
│                                                                             │
│  DEBOUNCE & THROTTLE                                                        │
│  ───────────────────                                                        │
│  - Min 30s entre deux syncs automatiques                                    │
│  - Max 1 sync/minute même avec actions rapprochées                          │
│  - Pas de limite pour sync manuel                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Implémentation debounce

```typescript
class SyncScheduler {
  private debounceTimer: number | null = null;
  private lastSyncTime: number = 0;
  private readonly MIN_INTERVAL = 30_000;  // 30 secondes
  private readonly DEBOUNCE_DELAY = 5_000; // 5 secondes

  scheduleSync(priority: 'low' | 'normal' | 'high' = 'normal') {
    // Annuler le timer précédent
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Vérifier le throttle
    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    if (timeSinceLastSync < this.MIN_INTERVAL && priority !== 'high') {
      return;
    }

    // Programmer le sync
    const delay = priority === 'high' ? 0 : this.DEBOUNCE_DELAY;
    this.debounceTimer = setTimeout(() => {
      this.executeSync();
    }, delay);
  }

  private async executeSync() {
    if (!navigator.onLine) {
      this.queueForLater();
      return;
    }

    try {
      await performBackup();
      this.lastSyncTime = Date.now();
      await db.syncMeta.update('sync', {
        isDirty: false,
        lastSyncAt: Date.now(),
        pendingChangesCount: 0
      });
    } catch (error) {
      this.handleSyncError(error);
    }
  }
}
```

---

### 3.5 Gestion hors-ligne et reprise

#### Queue de synchronisation

```typescript
interface SyncQueue {
  id: string;
  type: 'backup' | 'restore';
  createdAt: number;
  attempts: number;
  lastAttemptAt: number | null;
  status: 'pending' | 'in_progress' | 'failed' | 'completed';
  error?: string;
  payload?: any;
}

// Table Dexie pour la queue
db.version(3).stores({
  // ... existing tables
  syncQueue: 'id, status, createdAt'
});
```

#### Retry avec exponential backoff

```typescript
const BACKOFF_CONFIG = {
  initialDelay: 1_000,    // 1 seconde
  maxDelay: 300_000,      // 5 minutes max
  multiplier: 2,
  maxAttempts: 5
};

function calculateBackoff(attempts: number): number {
  const delay = BACKOFF_CONFIG.initialDelay * Math.pow(BACKOFF_CONFIG.multiplier, attempts);
  return Math.min(delay, BACKOFF_CONFIG.maxDelay);
}

async function processQueue() {
  const pendingItems = await db.syncQueue
    .where('status')
    .equals('pending')
    .toArray();

  for (const item of pendingItems) {
    if (item.attempts >= BACKOFF_CONFIG.maxAttempts) {
      await db.syncQueue.update(item.id, { status: 'failed' });
      continue;
    }

    const backoffDelay = calculateBackoff(item.attempts);
    const timeSinceLastAttempt = Date.now() - (item.lastAttemptAt || 0);

    if (timeSinceLastAttempt < backoffDelay) {
      continue; // Attendre encore
    }

    try {
      await db.syncQueue.update(item.id, {
        status: 'in_progress',
        lastAttemptAt: Date.now(),
        attempts: item.attempts + 1
      });

      await executeQueueItem(item);

      await db.syncQueue.update(item.id, { status: 'completed' });
    } catch (error) {
      await db.syncQueue.update(item.id, {
        status: 'pending',
        error: error.message
      });
    }
  }
}
```

#### Détection réseau et reprise

```typescript
// Écouter les changements de connectivité
window.addEventListener('online', () => {
  console.log('Connexion rétablie, reprise de la sync...');
  processQueue();
});

window.addEventListener('offline', () => {
  console.log('Hors ligne, sync en pause');
});

// Service Worker - Background Sync API (si supporté)
if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
  navigator.serviceWorker.ready.then(registration => {
    // Enregistrer un sync périodique
    registration.sync.register('backup-sync');
  });
}
```

---

### 3.6 Restauration (Import)

#### Liste des backups disponibles

```typescript
interface BackupListItem {
  id: string;           // Google Drive file ID
  name: string;         // Nom du fichier
  createdAt: number;    // Timestamp création
  size: number;         // Taille en bytes
  deviceId: string;     // Appareil source
  deviceName?: string;
  stats: {
    playersCount: number;
    gamesCount: number;
  };
}

async function listBackups(): Promise<BackupListItem[]> {
  const response = await gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    q: "name contains 'backup_' and name contains '.json.gz'",
    fields: 'files(id, name, createdTime, size, appProperties)',
    orderBy: 'createdTime desc',
    pageSize: 50
  });

  return response.result.files.map(file => ({
    id: file.id,
    name: file.name,
    createdAt: new Date(file.createdTime).getTime(),
    size: parseInt(file.size),
    deviceId: file.appProperties?.deviceId || 'unknown',
    deviceName: file.appProperties?.deviceName,
    stats: {
      playersCount: parseInt(file.appProperties?.playersCount || '0'),
      gamesCount: parseInt(file.appProperties?.gamesCount || '0')
    }
  }));
}
```

#### Aperçu avant restauration

```typescript
interface BackupPreview {
  meta: DriveBackup['meta'];
  stats: DriveBackup['stats'];
  summary: {
    newPlayers: number;      // Joueurs qui seraient ajoutés
    updatedPlayers: number;  // Joueurs qui seraient modifiés
    newGames: number;
    conflicts: ConflictItem[];
  };
}

async function previewBackup(fileId: string): Promise<BackupPreview> {
  // 1. Télécharger et décompresser
  const backup = await downloadAndDecompress(fileId);

  // 2. Comparer avec données locales
  const localPlayers = await db.players.where('deletedAt').equals(0).toArray();
  const localGames = await db.games.where('deletedAt').equals(0).toArray();

  // 3. Détecter les différences
  const summary = analyzeConflicts(backup.data, { localPlayers, localGames });

  return {
    meta: backup.meta,
    stats: backup.stats,
    summary
  };
}
```

#### UI de restauration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Écran "Restaurer une sauvegarde"                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📂 Sauvegardes disponibles                                                 │
│  ─────────────────────────────────────────────────                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📅 12 janv. 2026, 15:30          iPhone de Jean                     │   │
│  │    5 joueurs • 42 parties • 1.2 MB                          [Voir] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📅 11 janv. 2026, 20:15          iPad familial                      │   │
│  │    5 joueurs • 38 parties • 1.1 MB                          [Voir] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📅 10 janv. 2026, 12:00          MacBook                            │   │
│  │    4 joueurs • 35 parties • 0.9 MB                          [Voir] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                             │
│  ⚠️ La restauration remplacera vos données locales actuelles.              │
│     Vos données locales seront automatiquement sauvegardées avant.         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.7 Résolution de conflits

#### Stratégies disponibles

| Stratégie | Description | Use case |
|-----------|-------------|----------|
| **Last-Write-Wins (LWW)** | Le plus récent (`updatedAt`) gagne | Simple, par défaut |
| **Local-First** | Données locales prioritaires | Mode hors-ligne prolongé |
| **Remote-First** | Données Drive prioritaires | Après restauration |
| **User-Choice** | L'utilisateur choisit | Conflits critiques |
| **Merge** | Fusion intelligente | Entités différentes |

#### Algorithme de résolution (LWW par défaut)

```typescript
interface ConflictItem {
  entityType: 'player' | 'game' | 'gameModel';
  entityId: string;
  localVersion: { data: any; updatedAt: number };
  remoteVersion: { data: any; updatedAt: number };
  resolution: 'local' | 'remote' | 'pending';
}

function resolveConflict(conflict: ConflictItem, strategy: 'lww' | 'local' | 'remote'): any {
  switch (strategy) {
    case 'lww':
      return conflict.localVersion.updatedAt > conflict.remoteVersion.updatedAt
        ? conflict.localVersion.data
        : conflict.remoteVersion.data;
    case 'local':
      return conflict.localVersion.data;
    case 'remote':
      return conflict.remoteVersion.data;
  }
}

async function mergeData(
  backup: DriveBackup,
  strategy: 'lww' | 'local' | 'remote' = 'lww'
): Promise<MergeResult> {
  const conflicts: ConflictItem[] = [];
  const toInsert: any[] = [];
  const toUpdate: any[] = [];

  // Pour chaque entité du backup
  for (const player of backup.data.players) {
    const localPlayer = await db.players.get(player.id);

    if (!localPlayer) {
      // Nouveau joueur → insérer
      toInsert.push(player);
    } else if (localPlayer.updatedAt !== player.updatedAt) {
      // Conflit → résoudre
      const resolved = resolveConflict({
        entityType: 'player',
        entityId: player.id,
        localVersion: { data: localPlayer, updatedAt: localPlayer.updatedAt },
        remoteVersion: { data: player, updatedAt: player.updatedAt },
        resolution: 'pending'
      }, strategy);
      toUpdate.push(resolved);
    }
    // Si identiques → rien à faire
  }

  // Appliquer les changements
  await db.transaction('rw', db.players, async () => {
    await db.players.bulkAdd(toInsert);
    await db.players.bulkPut(toUpdate);
  });

  return { conflicts, inserted: toInsert.length, updated: toUpdate.length };
}
```

#### UI de résolution de conflits (V2+)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Résolution de conflits                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ⚠️ 2 conflits détectés                                                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 👤 Joueur "Jean"                                                    │   │
│  │                                                                     │   │
│  │  Local (12/01 15:30)          VS         Drive (12/01 14:00)       │   │
│  │  ─────────────────                       ─────────────────         │   │
│  │  Couleur: #3B82F6                        Couleur: #EF4444          │   │
│  │  Avatar: 🎮                               Avatar: 🎲                │   │
│  │                                                                     │   │
│  │  [Garder local]  [Garder Drive]  [Fusionner]                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🎯 Modèle "Skyjo perso"                                             │   │
│  │  ...                                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────      │
│  Stratégie par défaut : [Plus récent gagne ▼]                              │
│                                                                             │
│                    [Annuler]     [Appliquer tout]                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Décisions techniques

### 4.1 Données à sauvegarder

#### Schéma de sauvegarde

| Table | Inclus | Condition | Taille estimée |
|-------|--------|-----------|----------------|
| `players` | ✅ Oui | Tous (y compris deletedAt) | ~50KB (avec avatars) |
| `gameModels` | ✅ Partiel | Exclure `isPredefined && !isHidden && non modifié` | ~5KB |
| `games` | ✅ Oui | Tous | ~20KB |
| `gamePlayers` | ✅ Oui | Tous | ~5KB |
| `turns` | ✅ Oui | Tous | ~30KB |
| `turnScores` | ✅ Oui | Tous | ~50KB |
| `settings` | ✅ Oui | Configuration UI | <1KB |
| `syncMeta` | ❌ Non | Local uniquement | - |
| `syncQueue` | ❌ Non | Local uniquement | - |

**Taille totale estimée** : 150KB - 5MB (selon usage)
**Après compression** : 30KB - 1MB

#### Partitionnement (si nécessaire en V3)

Pour les très gros volumes :
- Backup incrémentiel (delta depuis dernier backup)
- Split par entité (players.json.gz, games.json.gz, etc.)

---

### 4.2 Chiffrement côté client

#### Proposition : Optionnel (V3)

| Aspect | Décision |
|--------|----------|
| **Par défaut** | Non chiffré |
| **Optionnel** | Chiffrement AES-256-GCM avec mot de passe utilisateur |
| **Dérivation clé** | PBKDF2 (100,000 itérations) |
| **Stockage clé** | Jamais stockée, dérivée à chaque utilisation |

#### Impact UX

| Sans chiffrement | Avec chiffrement |
|------------------|------------------|
| Backup/restore transparent | Demande mot de passe à chaque restore |
| Google peut lire les données | Google ne peut pas lire |
| Récupération si oubli possible | Perte si mot de passe oublié |

#### Implémentation (V3)

```typescript
async function encryptBackup(data: string, password: string): Promise<ArrayBuffer> {
  // 1. Dériver la clé
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // 2. Chiffrer
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(data)
  );

  // 3. Concaténer salt + iv + ciphertext
  return concatArrayBuffers(salt, iv, encrypted);
}
```

**Recommandation** : Reporter à V3. Le scope `drive.appdata` offre déjà une isolation suffisante pour la plupart des utilisateurs.

---

### 4.3 Gestion des tokens

#### Stockage

```typescript
// Table Dexie dédiée (pas localStorage pour refresh_token)
interface AuthTokens {
  id: 'google';
  accessToken: string;
  refreshToken: string;  // PKCE permet d'obtenir un refresh token
  expiresAt: number;     // Timestamp expiration
  scope: string;
  email?: string;        // Pour affichage UI
}

// Lecture avec vérification expiration
async function getValidAccessToken(): Promise<string> {
  const tokens = await db.authTokens.get('google');

  if (!tokens) {
    throw new AuthRequired();
  }

  // Marge de 5 minutes avant expiration
  if (tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
    return await refreshAccessToken(tokens.refreshToken);
  }

  return tokens.accessToken;
}
```

#### Refresh automatique

```typescript
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      // Refresh token révoqué ou expiré
      await db.authTokens.delete('google');
      throw new AuthRequired('Session expirée, veuillez vous reconnecter');
    }
    throw new Error('Erreur de rafraîchissement du token');
  }

  const data = await response.json();

  await db.authTokens.update('google', {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000
  });

  return data.access_token;
}
```

#### Révocation (déconnexion)

```typescript
async function disconnectGoogle(): Promise<void> {
  const tokens = await db.authTokens.get('google');

  if (tokens) {
    // Révoquer côté Google
    await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.accessToken}`, {
      method: 'POST'
    });

    // Supprimer localement
    await db.authTokens.delete('google');
  }

  // Nettoyer les métadonnées sync
  await db.syncMeta.update('sync', {
    lastSyncAt: null,
    isDirty: true
  });
}
```

---

### 4.4 Sécurité

#### Minimiser les scopes

```typescript
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata'  // MINIMUM
  // Ne PAS ajouter : drive, drive.readonly, etc.
];
```

#### Éviter d'exposer des secrets

| Élément | Exposition | Mitigation |
|---------|------------|------------|
| Client ID | Public (dans JS) | OK, pas un secret |
| Client Secret | N/A (PKCE) | Pas nécessaire avec PKCE |
| Access Token | Mémoire + IndexedDB | Expiration courte (1h) |
| Refresh Token | IndexedDB uniquement | Jamais en localStorage |

#### Content Security Policy

```html
<!-- Dans index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://apis.google.com https://accounts.google.com;
  connect-src 'self' https://*.googleapis.com https://oauth2.googleapis.com;
  frame-src https://accounts.google.com;
">
```

---

### 4.5 RGPD / Confidentialité

#### Points d'attention

| Aspect | Implémentation |
|--------|----------------|
| **Consentement** | Demander explicitement avant première connexion Google |
| **Transparence** | Expliquer quelles données sont sauvegardées |
| **Portabilité** | Export JSON déjà existant |
| **Droit à l'effacement** | Bouton "Supprimer toutes mes sauvegardes Drive" |
| **Minimisation** | Ne sauvegarder que le nécessaire |

#### Texte de consentement proposé

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  🔐 Connexion à Google Drive                                                │
│                                                                             │
│  En connectant votre compte Google, vous autorisez ScoreCompte à :          │
│                                                                             │
│  ✓ Créer et gérer des fichiers de sauvegarde dans un dossier dédié         │
│  ✓ Lire vos sauvegardes existantes pour les restaurer                      │
│                                                                             │
│  ScoreCompte n'accèdera PAS à vos autres fichiers Google Drive.            │
│                                                                             │
│  Vos données restent sous votre contrôle :                                  │
│  • Vous pouvez vous déconnecter à tout moment                              │
│  • Vous pouvez supprimer vos sauvegardes depuis l'application              │
│                                                                             │
│  En savoir plus sur notre politique de confidentialité                      │
│                                                                             │
│              [Annuler]          [Connecter Google Drive]                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Suppression des données

```typescript
async function deleteAllBackups(): Promise<void> {
  const files = await listBackups();

  for (const file of files) {
    await gapi.client.drive.files.delete({ fileId: file.id });
  }

  // Déconnecter également
  await disconnectGoogle();

  showNotification('Toutes vos sauvegardes ont été supprimées');
}
```

---

## 5. Backlog (User Stories)

### 5.1 MVP - Backup manuel

#### US-MVP-1 : Connexion Google Drive

**En tant qu'** utilisateur
**Je veux** me connecter à mon compte Google
**Afin de** pouvoir sauvegarder mes données sur Drive

**Acceptance Criteria (AC)**
- [ ] Bouton "Connecter Google Drive" sur l'écran Sauvegarde
- [ ] Flow OAuth PKCE fonctionnel (popup Google)
- [ ] Scope minimal `drive.appdata`
- [ ] Tokens stockés en IndexedDB
- [ ] État connecté affiché (email utilisateur)
- [ ] Gestion d'erreur (annulation, refus)

**Priorité** : P0 (Critique)

---

#### US-MVP-2 : Déconnexion Google Drive

**En tant qu'** utilisateur
**Je veux** pouvoir me déconnecter de Google Drive
**Afin de** révoquer l'accès à mes données

**AC**
- [ ] Bouton "Se déconnecter" visible si connecté
- [ ] Confirmation avant déconnexion
- [ ] Révocation du token côté Google
- [ ] Suppression des tokens locaux
- [ ] Retour à l'état "non connecté"

**Priorité** : P0 (Critique)

---

#### US-MVP-3 : Backup manuel

**En tant qu'** utilisateur
**Je veux** sauvegarder manuellement mes données sur Drive
**Afin de** créer une copie de sécurité

**AC**
- [ ] Bouton "Sauvegarder maintenant" (si connecté)
- [ ] Export JSON compressé (gzip)
- [ ] Upload vers `appDataFolder` Google Drive
- [ ] Nommage : `backup_{timestamp}_{deviceId}.json.gz`
- [ ] Feedback visuel (progression, succès, erreur)
- [ ] Timestamp dernière sauvegarde affiché

**Priorité** : P0 (Critique)

---

#### US-MVP-4 : Restauration basique

**En tant qu'** utilisateur
**Je veux** restaurer mes données depuis Drive
**Afin de** récupérer mes données sur un nouvel appareil

**AC**
- [ ] Liste des backups disponibles (date, taille)
- [ ] Téléchargement et décompression
- [ ] Mode "remplacer" uniquement (MVP)
- [ ] Confirmation avant restauration
- [ ] Backup automatique des données locales avant restore
- [ ] Feedback visuel (progression, succès, erreur)

**Priorité** : P0 (Critique)

---

#### US-MVP-5 : Écran Sauvegarde

**En tant qu'** utilisateur
**Je veux** un écran dédié à la gestion des sauvegardes
**Afin de** gérer facilement mes backups

**AC**
- [ ] Nouvel écran accessible depuis le drawer
- [ ] États clairs : non connecté / connecté / en cours
- [ ] Actions disponibles selon l'état
- [ ] Dernière sauvegarde (date/heure)
- [ ] Design mobile-first cohérent

**Priorité** : P0 (Critique)

---

### 5.2 V1 - Backup automatique

#### US-V1-1 : Détection de changements

**En tant qu'** utilisateur
**Je veux** que l'app détecte quand mes données changent
**Afin de** déclencher des sauvegardes automatiques

**AC**
- [ ] Flag `isDirty` mis à jour à chaque modification
- [ ] Hooks Dexie sur toutes les tables
- [ ] Compteur de modifications en attente
- [ ] Timestamp dernière modification

**Priorité** : P1 (Important)

---

#### US-V1-2 : Backup automatique périodique

**En tant qu'** utilisateur
**Je veux** que mes données soient sauvegardées automatiquement
**Afin de** ne pas perdre mes parties

**AC**
- [ ] Sync toutes les 5 minutes si `isDirty=true`
- [ ] Sync après fin de partie (debounce 30s)
- [ ] Pas de sync si hors ligne
- [ ] Indicateur discret "Sauvegarde en cours..."
- [ ] Option pour désactiver le backup auto

**Priorité** : P1 (Important)

---

#### US-V1-3 : Backup à la fermeture

**En tant qu'** utilisateur
**Je veux** que mes données soient sauvegardées quand je quitte l'app
**Afin de** ne rien perdre

**AC**
- [ ] Écoute `visibilitychange` → `hidden`
- [ ] Tentative de sync si dirty
- [ ] Best effort (non garanti sur mobile)
- [ ] Ne bloque pas la fermeture

**Priorité** : P2 (Nice to have)

---

#### US-V1-4 : Gestion hors-ligne

**En tant qu'** utilisateur
**Je veux** que mes modifications soient sauvegardées même hors ligne
**Afin de** ne rien perdre en cas de coupure réseau

**AC**
- [ ] Queue de synchronisation persistante
- [ ] Reprise automatique quand connexion rétablie
- [ ] Retry avec exponential backoff
- [ ] Indicateur "Sync en attente" si queue non vide

**Priorité** : P1 (Important)

---

#### US-V1-5 : Refresh automatique des tokens

**En tant qu'** utilisateur
**Je veux** rester connecté sans re-login constant
**Afin de** ne pas être interrompu

**AC**
- [ ] Refresh token stocké sécurisé
- [ ] Refresh automatique 5 min avant expiration
- [ ] Re-auth demandée si refresh échoue
- [ ] Message clair si session expirée

**Priorité** : P1 (Important)

---

### 5.3 V2 - Multi-backups + Restore avancé + Conflits

#### US-V2-1 : Liste des backups avec aperçu

**En tant qu'** utilisateur
**Je veux** voir la liste de mes sauvegardes avec détails
**Afin de** choisir laquelle restaurer

**AC**
- [ ] Liste triée par date (plus récent en haut)
- [ ] Infos : date, appareil source, nb joueurs, nb parties, taille
- [ ] Aperçu au clic (sans restaurer)
- [ ] Pagination si >10 backups

**Priorité** : P2 (Nice to have)

---

#### US-V2-2 : Mode fusion (merge)

**En tant qu'** utilisateur
**Je veux** fusionner un backup avec mes données locales
**Afin de** récupérer des données sans perdre les locales

**AC**
- [ ] Option "Fusionner" en plus de "Remplacer"
- [ ] Détection des conflits (même ID, timestamps différents)
- [ ] Stratégie par défaut : Last-Write-Wins
- [ ] Résumé avant validation (X ajoutés, Y mis à jour)

**Priorité** : P2 (Nice to have)

---

#### US-V2-3 : Résolution manuelle de conflits

**En tant qu'** utilisateur
**Je veux** pouvoir choisir quelle version garder en cas de conflit
**Afin de** contrôler mes données

**AC**
- [ ] Liste des conflits détectés
- [ ] Comparaison côte à côte (local vs Drive)
- [ ] Choix par conflit : local / Drive
- [ ] Bouton "Appliquer mes choix"

**Priorité** : P3 (Future)

---

#### US-V2-4 : Suppression de backups

**En tant qu'** utilisateur
**Je veux** supprimer d'anciens backups
**Afin de** libérer de l'espace Drive

**AC**
- [ ] Bouton supprimer sur chaque backup
- [ ] Confirmation avant suppression
- [ ] Option "Supprimer tous les backups"
- [ ] Conservation d'au moins 1 backup (warning)

**Priorité** : P2 (Nice to have)

---

#### US-V2-5 : Rétention automatique

**En tant qu'** utilisateur
**Je veux** que les anciens backups soient supprimés automatiquement
**Afin de** ne pas saturer mon Drive

**AC**
- [ ] Paramètre : conserver X derniers backups (défaut: 10)
- [ ] Paramètre : conserver les backups de moins de X jours (défaut: 30)
- [ ] Suppression automatique après chaque nouveau backup
- [ ] Au moins 1 backup toujours conservé

**Priorité** : P3 (Future)

---

### 5.4 V3 - Chiffrement + Multi-appareils

#### US-V3-1 : Chiffrement des backups

**En tant qu'** utilisateur
**Je veux** pouvoir chiffrer mes sauvegardes
**Afin de** protéger mes données personnelles

**AC**
- [ ] Option "Activer le chiffrement" dans les paramètres
- [ ] Création d'un mot de passe (avec confirmation)
- [ ] Chiffrement AES-256-GCM avant upload
- [ ] Demande de mot de passe à chaque restore
- [ ] Warning : perte de mot de passe = perte des données

**Priorité** : P3 (Future)

---

#### US-V3-2 : Identification des appareils

**En tant qu'** utilisateur
**Je veux** voir de quel appareil vient chaque backup
**Afin de** m'y retrouver avec plusieurs appareils

**AC**
- [ ] Device ID unique généré au premier lancement
- [ ] Possibilité de nommer son appareil ("iPhone de Jean")
- [ ] Appareil source affiché dans la liste des backups
- [ ] Filtre par appareil

**Priorité** : P3 (Future)

---

#### US-V3-3 : Sync bidirectionnelle

**En tant qu'** utilisateur
**Je veux** que mes données soient synchronisées entre appareils
**Afin de** jouer sur n'importe quel appareil

**AC**
- [ ] Détection de nouveau backup plus récent au lancement
- [ ] Proposition de merge/restore
- [ ] Merge automatique si pas de conflit
- [ ] Notification de sync inter-appareils

**Priorité** : P4 (Future)

---

## 6. Plan de livraison

### 6.1 Sprint 1 (S1) - MVP Backup manuel

**Durée estimée** : Focus développement
**Objectif** : Permettre backup/restore manuel fonctionnel

#### Périmètre

| US | Description | Story Points |
|----|-------------|--------------|
| US-MVP-1 | Connexion Google Drive | 5 |
| US-MVP-2 | Déconnexion Google Drive | 2 |
| US-MVP-3 | Backup manuel | 5 |
| US-MVP-4 | Restauration basique | 5 |
| US-MVP-5 | Écran Sauvegarde | 3 |

**Total** : 20 points

#### Livrables techniques

1. **Configuration Google Cloud Console**
   - Projet créé
   - OAuth consent screen configuré
   - Credentials (Client ID) générés
   - Domaines autorisés (localhost + prod)

2. **Nouveau module `/src/lib/googleAuth.ts`**
   - Fonctions OAuth PKCE
   - Gestion tokens (stockage, refresh)
   - Helper d'authentification

3. **Nouveau module `/src/lib/driveSync.ts`**
   - Upload/download fichiers
   - Liste des backups
   - Suppression

4. **Nouveau contexte `/src/contexts/GoogleAuthContext.tsx`**
   - État de connexion global
   - Provider pour toute l'app

5. **Nouvel écran `/src/app/routes/backup/BackupPage.tsx`**
   - UI de gestion des sauvegardes

6. **Mise à jour Dexie schema (v3)**
   - Table `authTokens`
   - Table `syncMeta`

#### Risques S1

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Verification Google lente | Moyenne | Élevé | Utiliser mode test (100 users) |
| CORS issues | Faible | Moyen | Google APIs supportent CORS natif |
| PWA + OAuth popup | Moyenne | Moyen | Tester sur iOS/Android tôt |

#### Tests S1

| Type | Couverture | Outils |
|------|------------|--------|
| Unit | Auth utils, compression | Vitest |
| Integration | Flow OAuth complet | Vitest + mock |
| E2E | Backup/restore | Playwright (manuel d'abord) |
| Manuel | iOS Safari, Android Chrome | Devices réels |

#### Métriques de succès S1

| Métrique | Cible |
|----------|-------|
| Taux de succès backup | >95% |
| Temps moyen backup (1MB) | <5s |
| Taux d'erreur OAuth | <5% |

---

### 6.2 Sprint 2 (S2) - V1 Backup automatique

**Durée estimée** : Focus développement
**Objectif** : Automatiser les sauvegardes

#### Périmètre

| US | Description | Story Points |
|----|-------------|--------------|
| US-V1-1 | Détection de changements | 3 |
| US-V1-2 | Backup automatique périodique | 5 |
| US-V1-3 | Backup à la fermeture | 2 |
| US-V1-4 | Gestion hors-ligne | 5 |
| US-V1-5 | Refresh automatique tokens | 3 |

**Total** : 18 points

#### Livrables techniques

1. **Module `/src/lib/syncScheduler.ts`**
   - Scheduler avec debounce/throttle
   - Listeners visibility change
   - Gestion priorité des syncs

2. **Module `/src/lib/syncQueue.ts`**
   - Queue persistante (Dexie)
   - Retry avec backoff
   - Traitement background

3. **Mise à jour hooks Dexie**
   - Marquage dirty automatique
   - Compteur modifications

4. **Mise à jour Dexie schema (v4)**
   - Table `syncQueue`

5. **UI améliorée**
   - Indicateur sync en cours
   - Badge "sync pending" si queue non vide
   - Toggle backup auto on/off

#### Risques S2

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Perf degradation | Moyenne | Moyen | requestIdleCallback |
| Battery drain | Moyenne | Moyen | Throttle agressif |
| Sync storm | Faible | Élevé | Debounce 30s minimum |

#### Tests S2

| Type | Couverture | Outils |
|------|------------|--------|
| Unit | Scheduler, queue, backoff | Vitest |
| Integration | Dirty flag + auto sync | Vitest |
| E2E | Scénario hors-ligne | Playwright (network throttle) |
| Performance | Memory/CPU impact | DevTools profiling |

#### Métriques de succès S2

| Métrique | Cible |
|----------|-------|
| Taux auto-sync réussi | >90% |
| Latence sync après modif | <30s |
| Queue processing après reconnexion | <1min |
| Impact battery | <5% additionnel |

---

### 6.3 Sprint 3 (S3) - V2 Multi-backups + Conflits

**Durée estimée** : Focus développement
**Objectif** : Gestion avancée des backups et conflits

#### Périmètre

| US | Description | Story Points |
|----|-------------|--------------|
| US-V2-1 | Liste des backups avec aperçu | 3 |
| US-V2-2 | Mode fusion (merge) | 8 |
| US-V2-3 | Résolution manuelle conflits | 5 |
| US-V2-4 | Suppression de backups | 2 |
| US-V2-5 | Rétention automatique | 3 |

**Total** : 21 points

#### Livrables techniques

1. **Module `/src/lib/conflictResolver.ts`**
   - Détection de conflits
   - Algorithmes de résolution (LWW, etc.)
   - Merge intelligent

2. **Composant `/src/components/backup/ConflictResolver.tsx`**
   - UI de comparaison
   - Sélection par conflit
   - Actions globales

3. **Composant `/src/components/backup/BackupList.tsx`**
   - Liste paginée
   - Aperçu rapide
   - Actions par backup

4. **Service de rétention**
   - Nettoyage automatique
   - Règles configurables

#### Risques S3

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Merge data loss | Moyenne | Élevé | Backup local avant tout merge |
| UX complexe conflits | Élevée | Moyen | Defaults LWW, UI progressive |
| Performance gros merge | Faible | Moyen | Pagination, workers |

#### Tests S3

| Type | Couverture | Outils |
|------|------------|--------|
| Unit | Conflict detection, merge algo | Vitest |
| Integration | Scénarios multi-device | Vitest (fixtures) |
| E2E | Flow complet avec conflits | Playwright |
| UX | Tests utilisateurs | 5 testeurs beta |

#### Métriques de succès S3

| Métrique | Cible |
|----------|-------|
| Détection conflits | 100% accuracy |
| Temps merge (500 items) | <3s |
| Satisfaction UX conflits | >4/5 |
| Taux perte données merge | 0% |

---

## Annexes

### A. Structure de fichiers proposée

```
src/
├── lib/
│   ├── googleAuth.ts        # OAuth PKCE utilities
│   ├── driveSync.ts         # Google Drive API wrapper
│   ├── syncScheduler.ts     # Auto-sync scheduler
│   ├── syncQueue.ts         # Offline queue management
│   ├── conflictResolver.ts  # Conflict detection & resolution
│   └── exportImport.ts      # (existant) Export/Import JSON
│
├── contexts/
│   └── GoogleAuthContext.tsx  # Auth state provider
│
├── components/
│   └── backup/
│       ├── BackupStatus.tsx    # Connection status display
│       ├── BackupList.tsx      # List of available backups
│       ├── BackupPreview.tsx   # Backup details preview
│       └── ConflictResolver.tsx # Conflict resolution UI
│
├── app/routes/
│   └── backup/
│       └── BackupPage.tsx      # Main backup screen
│
└── data/
    └── db.ts                   # (update) Add authTokens, syncMeta, syncQueue
```

### B. Configuration Google Cloud Console

1. **Créer un projet** : `scorecompte-backup`
2. **Activer l'API** : Google Drive API
3. **Configurer OAuth consent screen** :
   - Type : External
   - App name : ScoreCompte
   - Scopes : `drive.appdata`
   - Test users : (vos emails pour dev)
4. **Créer credentials** :
   - Type : OAuth 2.0 Client ID
   - Application type : Web application
   - Authorized JavaScript origins :
     - `http://localhost:5173`
     - `https://cam14111.github.io`
   - Authorized redirect URIs :
     - `http://localhost:5173/ScoreCompte/oauth-callback`
     - `https://cam14111.github.io/ScoreCompte/oauth-callback`

### C. Variables d'environnement

```env
# .env.local (dev)
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com

# .env.production (prod)
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

### D. Dépendances à ajouter

```json
{
  "dependencies": {
    // Aucune nouvelle dépendance requise !
    // - OAuth : fetch natif
    // - Compression : CompressionStream API native
    // - Crypto : Web Crypto API native
  }
}
```

**Note** : Pas de dépendance externe ajoutée. Tout utilise les APIs natives du navigateur.

---

## Changelog

| Version | Date | Auteur | Description |
|---------|------|--------|-------------|
| 1.0 | 2026-01-12 | Architecture | Version initiale |
