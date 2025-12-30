# 🎯 Score Counter - PWA de Comptage de Scores

Application web progressive (PWA) mobile-first pour le comptage de scores de jeux de société. Fonctionne 100% hors-ligne avec synchronisation cloud optionnelle.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![PWA](https://img.shields.io/badge/PWA-ready-green)
![Offline](https://img.shields.io/badge/offline-100%25-brightgreen)

## ✨ Fonctionnalités

### 🎮 Gestion des Parties
- **Création de parties** avec configuration complète
  - Sélection de modèle de jeu ou création personnalisée
  - Choix des joueurs (minimum 2)
  - Score limite et nombre de tours (optionnels)
  - Mode de scoring normal ou inversé
- **Grille de saisie interactive** type tableur
  - Interface mobile-optimisée
  - Saisie numérique fluide
  - Ajout/suppression de tours
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
  - Upload d'images (ready)
- **Palette de 17 couleurs** avec contraste intelligent
- **Statistiques** individuelles

### 🎲 Modèles de Jeux
- **Création de modèles réutilisables**
  - Configuration des règles de scoring
  - Nombre de joueurs min/max
  - Mode de saisie (tous ensemble / tour par joueur)
- **Validation** : impossible de supprimer un modèle en cours d'utilisation

### ⚙️ Paramètres & Personnalisation
- **Thèmes** : Système / Clair / Sombre
- **Contraste** : Défaut / Moyen / Élevé (accessibilité)
- **Application en temps réel** des changements

### 💾 Export / Import
- **Export JSON** avec filtres granulaires
  - Sélection : parties en cours, terminées, joueurs, modèles
  - Sauvegarde complète pour backup
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
│   │   ├── settings/
│   │   ├── import-export/
│   │   └── backup/       # (Supabase - à venir)
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
- **syncOutbox** : Queue de synchronisation (ready for Supabase)

### Indexes Optimisés
- `(gameId, turnIndex)` sur turns
- `(turnId, playerId)` sur turnScores
- `(userId, updatedAt)` pour la sync (ready)

## 🎨 Design System

### Couleurs
- **17 couleurs** prédéfinies pour les joueurs
- **Thème sombre** par défaut (optimisé pour mobile la nuit)
- **Contraste ajustable** (accessibilité)

### Composants
- **Mobile-first** : touch-optimized, no tap highlight
- **Safe areas** : support des encoches iPhone
- **Pull-to-refresh** désactivé pour éviter les conflits

## 📊 Use Cases

1. **Soirée jeux entre amis**
   - Créer les joueurs une fois
   - Lancer plusieurs parties (Papayoo, Flip 7, etc.)
   - Suivre les scores en temps réel
   - Voir le podium à la fin

2. **Suivi long terme**
   - Statistiques par joueur
   - Export CSV pour analyse dans Excel
   - Backup JSON avant changement d'appareil

3. **Offline complet**
   - Pas de connexion nécessaire
   - Toutes les données en local
   - Sync optionnelle (Supabase à venir)

## 🔜 Roadmap (Epic 8 - Optionnel)

### Supabase Integration
- [ ] Authentification (Magic Link / OTP)
- [ ] Backup automatique vers cloud
- [ ] Synchronisation multi-devices
- [ ] Stratégie de résolution de conflits (last-write-wins)
- [ ] Upload d'avatars vers Supabase Storage

### Optimisations
- [ ] Code splitting (dynamic imports)
- [ ] Lazy loading des routes
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
- **Service Worker** : cache agressif des assets
- **Bundle size** : ~1.2MB (optimisable avec code splitting)

## 📄 License

Projet créé pour l'utilisateur. Tous droits réservés.

## 🙏 Crédits

- **UI Components** : shadcn/ui
- **Icons** : Lucide React
- **Font** : System fonts (San Francisco, Segoe UI, Roboto)
- **Framework** : React + Vite

---

**Version actuelle** : 1.0.0
**Dernière mise à jour** : 30 décembre 2024
**Status** : ✅ Production Ready (sans Supabase)
