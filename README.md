# 🎯 Score Counter - PWA de Comptage de Scores

Application web progressive (PWA) mobile-first pour le comptage de scores de jeux de société. Fonctionne 100% hors-ligne avec stockage local sécurisé.

![Version](https://img.shields.io/badge/version-2.6.0-blue)
![PWA](https://img.shields.io/badge/PWA-ready-green)
![Offline](https://img.shields.io/badge/offline-100%25-brightgreen)
![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-success)
![Performance](https://img.shields.io/badge/performance-optimized-brightgreen)

## 🆕 Nouveautés Version 2.x

### Revue complète & améliorations (2.6.0) 🚀
- **Mobile** : les boutons « Retour / Terminer » de la grille de scores sont de nouveau visibles sans scroller
- **Thème Système / Clair / Sombre** : sélecteur dans le menu, persistant, appliqué avant le premier rendu (sans flash)
- **Accueil repensé** : reprise en un geste des parties en cours + accès rapide « Nouvelle partie »
- **Performance** : bundle d'icônes réduit de ~488 KB (imports lucide-react tree-shakeables) ; totaux calculés en 2 requêtes
- **Fiabilité** :
  - validation structurelle des imports JSON et des restaurations Google Drive avant toute écriture
  - le dialogue de fin de partie ne réapparaît plus en boucle après « Continuer et ignorer »
  - index de tour unique après suppression d'un tour
  - échappement correct des guillemets dans l'export CSV
- **Avatars image** : redimensionnement automatique à 256 px (PNG transparent préservé), plus de limite bloquante de 500 KB
- **Accessibilité** : libellés ARIA sur les boutons icônes, dialogues avec `role="dialog"` + fermeture Escape, zoom pince réactivé
- **Qualité** : ESLint 9 opérationnel (0 erreur), corrections de hooks React

### Gestion des mises à jour (2.3.0) 🔄
- **Détection intelligente des mises à jour** :
  - Détecte automatiquement quand une nouvelle version est disponible
  - Remplace l'écran d'erreur "Failed to fetch dynamically imported module" par un message convivial
  - Modal d'avertissement invitant l'utilisateur à recharger l'application
  - Rechargement automatique en un clic pour charger la nouvelle version
- **Correction de la synchronisation de version** :
  - La version de l'application dans les backups est maintenant synchronisée avec package.json
  - Plus de version hardcodée obsolète

### Navigation intelligente sur validation (2.2.0) 🎯
- Navigation automatique vers les cellules de scores non remplies lors de la validation

### Améliorations diverses (2.1.0) 🔧
- Corrections de bugs et améliorations de stabilité

### Score zéro (2.0.0) ✅
- Support de la saisie de score zéro (0) dans les cellules

## Historique Version 1.8.x

### Sauvegarde Google Drive (1.8.0) ☁️
- **Connexion au compte Google** :
  - Authentification OAuth 2.0 sécurisée via popup
  - Scope restrictif : accès uniquement aux fichiers créés par l'app
  - Affichage du nom et email du compte connecté
  - Déconnexion avec révocation du token
- **Sauvegarde automatique sur Google Drive** :
  - Sauvegarde périodique configurable (15min, 30min, 1h, 2h)
  - Sauvegarde automatique sur actions critiques (création/modification)
  - Sauvegarde à la fermeture de l'application
  - Compression gzip et vérification d'intégrité SHA-256
- **Gestion des backups** :
  - Liste des sauvegardes avec date, taille et appareil d'origine
  - Restauration en mode "Fusion" ou "Remplacement"
  - Backup de sécurité automatique avant restauration
  - Purge automatique des anciens backups (configurable)
- **Fonctionnement hors ligne** :
  - Queue locale des backups en attente
  - Synchronisation automatique au retour en ligne
  - Retry avec backoff exponentiel (max 5 tentatives)
- **Multi-appareils** :
  - Synchronisation entre appareils via le même compte Google
  - ID appareil inclus dans les métadonnées pour traçabilité

📖 Voir [BACKUP_SETUP.md](./BACKUP_SETUP.md) pour la configuration détaillée.

## Historique Version 1.7.x

### Corrections & Améliorations (1.7.1) 🔧
- **Protection des modèles prédéfinis** :
  - Les 7 modèles de jeux prédéfinis ne peuvent plus être supprimés
  - Seuls les modèles créés par l'utilisateur peuvent être supprimés
  - Les modèles prédéfinis peuvent être modifiés ou masqués
  - Message d'erreur explicite en cas de tentative de suppression
- **Visibilité des modèles masqués** :
  - Les modèles masqués restent visibles dans l'écran de gestion
  - Bouton "Voir cachés" pour basculer l'affichage
  - Les modèles masqués n'apparaissent plus dans la création de partie

### Statistiques Avancées & Avatars Personnalisés (1.7.0) 🎨📊
- **Statistiques Avancées par Joueur** :
  - Moyenne de points par partie
  - Taux de victoire en pourcentage
  - Classement moyen
  - Meilleur et pire score
  - Total de points cumulés
  - Historique complet des parties avec détails (score, rang, adversaires)
  - Page dédiée accessible depuis le profil joueur
- **Avatars Personnalisés** :
  - Upload d'images personnelles (jusqu'à 500 KB)
  - Support PNG, JPG et autres formats image
  - Stockage local en base64
  - Nouvel onglet "Image" dans le sélecteur d'avatar
  - Prévisualisation et suppression facile

### Optimisations de Performance (1.6.0) ⚡
- **Code Splitting** : Routes lazy-loadées avec React.lazy() et Suspense
  - Bundle initial réduit de ~30%
  - Chargement à la demande (2-10 KB par route)
  - LoadingFallback avec spinner pour transitions fluides
- **Chunk Splitting Optimisé** : Vendors séparés pour meilleur caching
  - react-vendor (44.81 KB gzippé)
  - router-vendor (24.49 KB gzippé)
  - db-vendor (30.61 KB gzippé)
  - date-vendor (6.32 KB gzippé)
  - ui-vendor (137.72 KB gzippé)
- **React.memo** : PlayerCard et GameCard mémorisés pour éviter re-renders inutiles
- **Bundle Analyzer** : Visualisation du bundle avec rollup-plugin-visualizer
- **Minification Terser** : Console.logs supprimés en production

### Améliorations UX & Performance (1.5.6)
- **Navigation tactile optimisée** : Navigation fluide entre cellules de score au doigt
- **Édition libre** : Modification possible des scores précédemment saisis
- **Interface simplifiée** : Suppression des écrans redondants pour une UX épurée
- **Validation améliorée** : Dialogues de confirmation plus réactifs
- **PWA complète** : Icônes optimisées pour iOS et Android (192x192, 512x512, apple-touch-icon)

### Déploiement
- **GitHub Pages** : Application accessible en ligne à tout moment
- **Base path configuré** : Support du déploiement sur sous-domaine `/ScoreCompte/`
- **Service Worker** : Mise à jour automatique de l'application

## ✨ Fonctionnalités

### 🎮 Gestion des Parties
- **Création de parties** avec configuration complète
  - Sélection de modèle de jeu ou création personnalisée
  - Choix des joueurs (minimum 2)
  - Score limite et nombre de tours (optionnels)
  - Mode de scoring normal ou inversé
- **Grille de saisie interactive** type tableur
  - Interface mobile-optimisée avec navigation tactile
  - Saisie numérique fluide et édition libre des scores
  - Navigation au doigt entre cellules
  - Ajout/suppression de tours à la volée
  - Calculs automatiques en temps réel
- **Détection automatique de fin**
  - Par score limite atteint
  - Par nombre de tours maximum
  - Modal de confirmation avec option de continuation
- **Liste des parties** avec filtres
  - Parties en cours / terminées
  - Métadonnées riches (joueurs, tours, date)

### 🏆 Résultats & Podium
- **Podium visuel** pour le top 3
- **Classement complet** avec gestion des ex-aequo
- **Fonction "Rejouer"** pour relancer une partie avec la même config
- **Statistiques** par joueur (victoires, parties jouées)

### 👥 Gestion des Joueurs
- **CRUD complet** (création, édition, suppression)
- **Avatars personnalisables**
  - Initiales auto-générées
  - 25+ icônes Lucide
  - Upload d'images personnelles (PNG, JPG, 500 KB max) ✨ NEW
- **Palette de 17 couleurs** avec contraste intelligent
- **Statistiques** individuelles basiques (parties, victoires)
- **Statistiques avancées** ✨ NEW :
  - Moyenne de points, taux de victoire, classement moyen
  - Meilleur/pire score
  - Historique détaillé des parties

### 🎲 Modèles de Jeux
- **Création de modèles réutilisables**
  - Configuration des règles de scoring
  - Nombre de joueurs min/max
  - Mode de saisie (tous ensemble / tour par joueur)
- **7 modèles prédéfinis** inclus :
  - **Skyjo** : 2-8 joueurs, score inversé, limite 100 points
  - **6 qui prend!** : 2-10 joueurs, score inversé, limite 66 points
  - **Papayoo** : 3-8 joueurs, score inversé, 5 tours
  - **Flip 7** : 3-18 joueurs, score normal, limite 200 points
  - **5 Rois** : 2-7 joueurs, score inversé, 11 tours
  - **DEKAL** : 2-6 joueurs, score inversé, 16 tours
  - **Tarot** : 3-5 joueurs, score normal, tours illimités
- **Protection des modèles prédéfinis** 🔒 :
  - Les modèles prédéfinis **ne peuvent pas être supprimés**
  - Ils peuvent uniquement être **modifiés** ou **masqués**
  - Seuls les modèles personnalisés créés par l'utilisateur sont supprimables
- **Masquage de modèles** :
  - Masquer un modèle le retire de la liste de création de partie
  - Il reste visible dans l'écran de gestion des modèles
  - Bouton "Voir cachés" pour afficher/masquer les modèles cachés
- **Validation** : impossible de supprimer un modèle en cours d'utilisation

### ⚙️ Paramètres & Personnalisation
- **Thèmes** : Système / Clair / Sombre
- **Contraste** : Défaut / Moyen / Élevé (accessibilité)
- **Application en temps réel** des changements

### 💾 Export / Import / Sauvegarde Cloud
- **Sauvegarde Google Drive** ✨ NEW :
  - Connexion sécurisée via compte Google (OAuth 2.0)
  - Sauvegarde automatique et manuelle sur le cloud
  - Restauration depuis n'importe quel appareil
  - Fonctionnement hors ligne avec synchronisation automatique
  - Voir [BACKUP_SETUP.md](./BACKUP_SETUP.md) pour la configuration
- **Export JSON** avec filtres granulaires
  - Sélection : parties en cours, terminées, joueurs, modèles
  - Sauvegarde complète pour backup local
- **Export CSV** compatible Excel
  - Résultats des parties terminées
  - Séparateur `;` pour Excel français
  - UTF-8 avec BOM
- **Import JSON** avec 2 modes
  - **Fusion** : ajoute sans supprimer
  - **Remplacement** : restauration complète

### 📱 PWA Features
- **Installable** sur mobile et desktop
- **Offline-first** : fonctionne sans connexion
- **Service Worker** avec cache intelligent
- **Manifest** complet avec icônes

## 🛠 Stack Technique

### Frontend
- **React 18** + **TypeScript**
- **Vite 5** (build ultra-rapide)
- **TanStack Router** (routing typé)
- **Tailwind CSS** (styling utility-first)
- **shadcn/ui** (composants modernes)
- **Lucide React** (icônes)

### Data & Offline
- **Dexie.js** (IndexedDB wrapper)
- **dexie-react-hooks** (reactive queries)
- **Offline-first architecture**

### PWA
- **vite-plugin-pwa** (génération automatique)
- **Workbox** (service worker strategy)
- **Manifest.json** avec icônes 192/512

### Utilities
- **date-fns** (formatage de dates)
- **clsx** + **tailwind-merge** (classes conditionnelles)
- **class-variance-authority** (variants de composants)

## 🚀 Installation & Démarrage

### Développement Local

```bash
# Installation des dépendances
npm install

# Démarrage en développement
npm run dev

# Build de production
npm run build

# Preview du build
npm run preview
```

L'application sera accessible sur **http://localhost:3000**

### Déploiement GitHub Pages

L'application est configurée pour être déployée sur GitHub Pages avec le base path `/ScoreCompte/`. Le déploiement se fait automatiquement via GitHub Actions sur chaque push vers la branche principale.

**Configuration** :
- Base URL : `/ScoreCompte/` (configuré dans `vite.config.ts`)
- Router basepath : `/ScoreCompte/` (configuré dans `src/app/router.tsx`)
- Service Worker scope : `/ScoreCompte/` (configuré dans manifest PWA)

## 📂 Structure du Projet

```
src/
├── app/
│   ├── layout/           # AppShell, TopBar, Drawer
│   ├── routes/           # Pages par fonctionnalité
│   │   ├── home/
│   │   ├── games/        # Création, listing, détail, résultats
│   │   ├── players/      # CRUD joueurs
│   │   ├── models/       # CRUD modèles
│   │   └── import-export/
│   └── router.tsx
├── components/
│   ├── ui/               # Composants shadcn (Button, Card, etc.)
│   ├── game/             # ScoreGrid, GameCard, Podium
│   ├── players/          # PlayerCard, Avatar, ColorPicker
│   └── common/
├── data/
│   ├── db.ts             # Schéma Dexie
│   └── repositories/     # Logique métier par entité
├── lib/
│   ├── cn.ts             # Utility className
│   ├── colors.ts         # Palette + contraste
│   ├── avatarIcons.ts    # Liste d'icônes
│   └── exportImport.ts   # Export/Import logic
├── state/
│   └── settingsStore.ts  # Gestion des paramètres
├── pwa/
│   └── registerSW.ts     # Service Worker
└── index.css             # Global styles + theme

```

## 🗄 Schéma de Données (IndexedDB)

### Tables Principales
- **players** : Joueurs (nom, couleur, avatar, stats)
- **gameModels** : Modèles de jeux (règles, scoring)
- **games** : Parties (config, status, gagnant)
- **gamePlayers** : Association parties-joueurs
- **turns** : Tours de jeu
- **turnScores** : Scores par tour et par joueur
- **settings** : Préférences utilisateur

### Indexes Optimisés
- `(gameId, turnIndex)` sur turns pour récupération rapide
- `(turnId, playerId)` sur turnScores pour calculs efficaces
- Soft delete avec `deletedAt` pour toutes les entités

## 🎨 Design System

### Couleurs
- **17 couleurs** prédéfinies pour les joueurs
- **Thème sombre** par défaut (optimisé pour mobile la nuit)
- **Contraste ajustable** (accessibilité)

### Composants
- **Mobile-first** : touch-optimized, no tap highlight, zones tactiles optimales
- **Safe areas** : support des encoches iPhone et Android
- **Pull-to-refresh** désactivé pour éviter les conflits
- **Navigation fluide** : Transitions tactiles entre cellules de score
- **Feedback visuel** : États hover/focus/active pour tous les éléments interactifs

## 📊 Use Cases

1. **Soirée jeux entre amis**
   - Créer les joueurs une fois
   - Lancer plusieurs parties (Papayoo, Flip 7, etc.)
   - Suivre les scores en temps réel
   - Voir le podium à la fin

2. **Suivi long terme**
   - Statistiques par joueur
   - Export CSV pour analyse dans Excel
   - Sauvegarde automatique Google Drive

3. **Multi-appareils**
   - Connectez votre compte Google une fois
   - Vos données sont sauvegardées automatiquement dans le cloud
   - Restaurez sur n'importe quel appareil (téléphone, tablette, PC)
   - Synchronisation transparente

4. **Offline complet**
   - Pas de connexion nécessaire pour jouer
   - Toutes les données stockées localement (IndexedDB)
   - Backups mis en queue et synchronisés au retour en ligne

## 🔜 Roadmap

### Fonctionnalités Futures
- [x] **Statistiques avancées** ✅ v1.7.0
- [x] **Avatars personnalisés** (upload d'images) ✅ v1.7.0
- [x] **Sauvegarde Google Drive** ✅ v1.8.0
- [ ] **Graphiques** : Visualisation de l'évolution des scores (courbes, barres)
- [ ] **Multi-langue** : Support français/anglais
- [ ] **Notifications PWA** : Rappel pour les parties en cours
- [ ] **Partage de parties** : Export de résultats à partager

### Optimisations
- [x] **Code splitting** (dynamic imports) ✅ v1.6.0
- [x] **Lazy loading des routes** ✅ v1.6.0
- [x] **Vendor chunk splitting** ✅ v1.6.0
- [x] **React.memo sur composants de liste** ✅ v1.6.0
- [x] **Bundle analyzer** ✅ v1.6.0
- [ ] Image optimization
- [ ] Analytics (optionnel)

## 🧪 Tests

```bash
# Tester l'installation PWA
1. Build de production : npm run build
2. Preview : npm run preview
3. Ouvrir DevTools > Application > Service Worker
4. Vérifier "Offline" et recharger

# Tester l'export/import
1. Créer quelques joueurs et parties
2. Export JSON
3. Supprimer les données (Import > Replace > fichier vide)
4. Import JSON du fichier exporté
5. Vérifier que tout est restauré
```

## 📝 Notes de Développement

### Conventions
- **Commit messages** : feat/fix/docs/style/refactor
- **Branches** : `claude/feature-name-XXXXX`
- **TypeScript strict mode** activé

### Performance
- **IndexedDB** : rapide, pas de limite de taille (>50MB typique)
- **Service Worker** : cache agressif des assets, mise à jour automatique
- **Bundle optimisé** :
  - Code splitting avec lazy routes (2-10 KB par route)
  - Vendor chunks séparés pour meilleur caching
  - Total gzippé : ~250 KB (vendors) + routes à la demande
  - React.memo sur composants de liste pour éviter re-renders
- **Navigation tactile** : Optimisée pour une utilisation mobile fluide
- **Édition en place** : Pas de rechargement de page, modifications instantanées
- **Analyse de bundle** : `npm run build` génère `dist/stats.html` pour visualisation

### Accessibilité
- **Touch-optimized** : Zones tactiles généreuses pour mobile
- **Contraste ajustable** : 3 niveaux (défaut, moyen, élevé)
- **Thème sombre** : Réduit la fatigue oculaire
- **Pas de tap-delay** : Interaction instantanée

## 📄 License

Projet créé pour l'utilisateur. Tous droits réservés.

## 🙏 Crédits

- **UI Components** : shadcn/ui
- **Icons** : Lucide React
- **Font** : System fonts (San Francisco, Segoe UI, Roboto)
- **Framework** : React + Vite

---

**Version actuelle** : 2.6.0
**Dernière mise à jour** : 4 juillet 2026
**Status** : ✅ Production Ready (Feature Complete)
**Déploiement** : GitHub Pages
**Stockage** : Local (IndexedDB) + Cloud (Google Drive)
**Bundle** : ~250 KB (vendors gzippés) + routes lazy-loadées (2-10 KB)
**Nouveautés** : Gestion intelligente des mises à jour de version
