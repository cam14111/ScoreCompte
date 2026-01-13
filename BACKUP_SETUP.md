# Configuration de la Sauvegarde Google Drive

Ce guide explique comment configurer la fonctionnalité de sauvegarde automatique sur Google Drive pour ScoreCompte.

## Vue d'ensemble

La sauvegarde Google Drive permet de :
- ✅ Sauvegarder automatiquement vos parties, joueurs et modèles de jeux
- ✅ Restaurer vos données sur n'importe quel appareil
- ✅ Gérer plusieurs backups avec historique
- ✅ Fonctionner hors ligne (synchronisation automatique au retour en ligne)
- ✅ Compression et vérification d'intégrité des données

## Prérequis

1. Un compte Google
2. Accès à la [Google Cloud Console](https://console.cloud.google.com/)

## Configuration Google OAuth 2.0

### Étape 1 : Créer un projet Google Cloud

1. Rendez-vous sur https://console.cloud.google.com/
2. Cliquez sur "Sélectionner un projet" → "Nouveau projet"
3. Nommez votre projet (ex: "ScoreCompte")
4. Cliquez sur "Créer"

### Étape 2 : Activer l'API Google Drive

1. Dans le menu, allez à "APIs & Services" → "Library"
2. Recherchez "Google Drive API"
3. Cliquez sur "Activer"

### Étape 3 : Créer des identifiants OAuth 2.0

1. Allez dans "APIs & Services" → "Credentials"
2. Cliquez sur "Créer des identifiants" → "ID client OAuth"
3. Si demandé, configurez l'écran de consentement OAuth :
   - Type d'application : Externe
   - Nom de l'application : ScoreCompte
   - E-mail d'assistance : votre email
   - Scopes : Ajoutez `.../auth/drive.file` (accès aux fichiers créés par l'app uniquement)
   - Testeurs (en développement) : ajoutez votre email
4. Pour l'ID client OAuth :
   - Type d'application : **Application Web**
   - Nom : ScoreCompte Web Client
   - **Origines JavaScript autorisées** : ajoutez vos URLs
     - Pour le développement local : `http://localhost:5173`
     - Pour la production : `https://votre-domaine.com`
   - **URI de redirection autorisés** : mêmes valeurs que les origines
5. Cliquez sur "Créer"
6. **Copiez le Client ID** (format: `xxx.apps.googleusercontent.com`)

### Étape 4 : Configurer les variables d'environnement

1. Créez un fichier `.env` à la racine du projet (basé sur `.env.example`) :

```bash
cp .env.example .env
```

2. Éditez `.env` et remplacez les valeurs :

```env
VITE_GOOGLE_CLIENT_ID=votre_client_id.apps.googleusercontent.com
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173
```

3. Pour la production, ajoutez ces variables d'environnement sur votre plateforme de déploiement (Vercel, Netlify, etc.)

### Étape 5 : Tester la configuration

1. Démarrez l'application en développement :

```bash
npm run dev
```

2. Accédez à la page "Sauvegarde Drive" dans le menu
3. Cliquez sur "Se connecter à Google"
4. Autorisez l'application à accéder à Google Drive
5. Vérifiez que la connexion est réussie

## Utilisation

### Sauvegarde Automatique

Une fois connecté, la sauvegarde automatique est activée par défaut :
- **Périodique** : Toutes les 30 minutes (configurable)
- **À la fermeture** : Lors de la fermeture de l'application
- **Sur actions critiques** : Après création/modification de données importantes

### Sauvegarde Manuelle

1. Allez dans "Sauvegarde Drive"
2. Cliquez sur "Sauvegarder maintenant"

### Restauration

1. Allez dans "Sauvegarde Drive"
2. Dans la liste des backups, choisissez celui à restaurer
3. Sélectionnez le mode :
   - **Remplacement** : Efface toutes les données actuelles (recommandé)
   - **Fusion** : Ajoute aux données existantes
4. Cliquez sur "Restaurer"

### Configuration Avancée

Dans la page "Sauvegarde Drive", vous pouvez configurer :
- **Intervalle de sauvegarde** : 15min, 30min, 1h, 2h
- **Nombre de backups à conserver** : 3, 5, 10, 20
- **Sauvegarde à la fermeture** : Activée/Désactivée

## Structure des Fichiers

Les backups sont stockés sur Google Drive dans un dossier `Score_Compte` avec cette convention de nommage :

```
ScoreCompte_{deviceId}_{env}_backup_v{schemaVersion}_{JJMMAAAA-HHMMSS}.json.gz
```

Exemple :
```
ScoreCompte_device_1736700000_xyz_production_backup_v1_0_0_12012026-143022.json.gz
```

### Format des Données

- **Format** : JSON compressé avec gzip
- **Contenu** : Parties, joueurs, modèles de jeux, tours, scores
- **Métadonnées** : Version du schéma, ID appareil, timestamp, hash SHA-256
- **Taille moyenne** : ~10-50 KB (compressé)

## Sécurité

### Scopes OAuth (Permissions)

L'application utilise le scope **le plus restrictif** :
- `https://www.googleapis.com/auth/drive.file`
- Permet **uniquement** l'accès aux fichiers créés par l'application
- **Aucun accès** aux autres fichiers de votre Google Drive

### Stockage des Données

- **Token** : Stocké dans le localStorage du navigateur
- **Expiration** : Les tokens expirent automatiquement
- **Révocation** : Possible via la déconnexion ou les paramètres Google

### Intégrité des Données

- **Compression** : gzip pour réduire la taille
- **Hash SHA-256** : Vérification d'intégrité lors de la restauration
- **Backup de sécurité** : Créé automatiquement avant chaque restauration

## Fonctionnalités Hors Ligne

### Queue de Sauvegarde

Lorsque vous êtes hors ligne :
1. Les backups sont ajoutés à une **queue locale**
2. Un indicateur s'affiche : "X backup(s) en attente"
3. Dès le retour en ligne, la queue est automatiquement traitée
4. Maximum **5 tentatives** par backup avec backoff exponentiel

### Gestion d'Erreurs

- **Token expiré** : Message d'erreur avec invitation à se reconnecter
- **Quota dépassé** : Notification et purge automatique des anciens backups
- **Erreur réseau** : Ajout à la queue et retry automatique

## Multi-Appareils

### Synchronisation

- Connectez-vous avec le **même compte Google** sur tous vos appareils
- Les backups de tous les appareils sont visibles
- L'ID de l'appareil est inclus dans le nom du fichier

### Gestion des Conflits

- **Par défaut** : Le backup le plus récent est proposé
- **Recommandation** : Utilisez le mode "Remplacement" pour éviter les doublons
- Les métadonnées (timestamp, deviceId) permettent d'identifier l'origine

## Dépannage

### "GOOGLE_CLIENT_ID non configuré"

→ Vérifiez que le fichier `.env` existe et contient `VITE_GOOGLE_CLIENT_ID`

### "Impossible d'ouvrir la popup d'authentification"

→ Autorisez les popups pour ce site dans votre navigateur

### "Token expiré. Veuillez vous reconnecter"

→ Déconnectez-vous et reconnectez-vous depuis la page "Sauvegarde Drive"

### "Quota Google Drive dépassé"

→ Supprimez manuellement des anciens backups ou augmentez votre quota Google Drive

### Les backups ne s'affichent pas

1. Vérifiez que vous êtes bien connecté
2. Actualisez la liste avec le bouton de rafraîchissement
3. Vérifiez les permissions OAuth dans https://myaccount.google.com/permissions

## Architecture Technique

### Services

- **GoogleAuthService** : Gestion OAuth 2.0 (Implicit Flow)
- **GoogleDriveService** : API Google Drive v3 (CRUD fichiers)
- **BackupManager** : Orchestration sauvegarde/restauration
- **BackupRepository** : État local (localStorage)

### Hooks React

- `useGoogleAuth()` : État d'authentification
- `useBackupStatus()` : État du système de backup
- `useCreateBackup()` : Création manuelle
- `useListBackups()` : Liste des backups
- `useRestoreBackup()` : Restauration

### Intégration

Les repositories (`gamesRepository`, `playersRepository`, `gameModelsRepository`) appellent automatiquement `markDataDirty()` après chaque modification, déclenchant la sauvegarde automatique selon la configuration.

## Licence & Support

- **Projet** : ScoreCompte v1.7.1+
- **Fonctionnalité** : Sauvegarde Google Drive
- **Support** : Ouvrir une issue sur GitHub

---

**Note** : Cette fonctionnalité nécessite une connexion internet pour l'upload/download des backups, mais fonctionne hors ligne avec une queue locale.
