/**
 * Service d'authentification Google OAuth 2.0 (côté client)
 * Utilise l'Implicit Flow avec rafraîchissement silencieux par popup
 * (prompt=none) pour maintenir une connexion persistante sans client_secret.
 */

import {
  GoogleAuthState,
  GOOGLE_DRIVE_SCOPES,
  BackupError,
  BackupErrorCode,
} from './types';

// Configuration OAuth
const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI =
  (import.meta as any).env?.VITE_GOOGLE_REDIRECT_URI || window.location.origin;

// Clés de stockage localStorage
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'google_drive_access_token',
  EXPIRES_AT: 'google_drive_expires_at',
  USER_EMAIL: 'google_drive_user_email',
  USER_NAME: 'google_drive_user_name',
  HAS_GRANTED_CONSENT: 'google_drive_has_granted_consent',
};

// Rafraîchir le token 5 minutes avant expiration
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export class GoogleAuthService {
  private static instance: GoogleAuthService;
  private authState: GoogleAuthState = {
    isAuthenticated: false,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    userEmail: null,
    userName: null,
  };
  private listeners: Array<(state: GoogleAuthState) => void> = [];
  private silentRefreshPromise: Promise<void> | null = null;

  private constructor() {
    this.loadAuthStateFromStorage();
    this.startTokenExpirationCheck();
  }

  public static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  // ─── Storage ─────────────────────────────────────────────────────────

  private loadAuthStateFromStorage(): void {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
    const userEmail = localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
    const userName = localStorage.getItem(STORAGE_KEYS.USER_NAME);

    if (accessToken && expiresAt) {
      const expiresAtNum = parseInt(expiresAt, 10);
      const isExpired = Date.now() >= expiresAtNum;

      if (!isExpired) {
        this.authState = {
          isAuthenticated: true,
          accessToken,
          refreshToken: null,
          expiresAt: expiresAtNum,
          userEmail,
          userName,
        };
      }
      // Si expiré, on ne clear pas — tryAutoRefresh() tentera un silent refresh
    }
  }

  private saveAuthStateToStorage(): void {
    if (this.authState.accessToken && this.authState.expiresAt) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, this.authState.accessToken);
      localStorage.setItem(
        STORAGE_KEYS.EXPIRES_AT,
        this.authState.expiresAt.toString()
      );
    }
    if (this.authState.userEmail) {
      localStorage.setItem(STORAGE_KEYS.USER_EMAIL, this.authState.userEmail);
    }
    if (this.authState.userName) {
      localStorage.setItem(STORAGE_KEYS.USER_NAME, this.authState.userName);
    }
  }

  private clearAuthState(): void {
    this.authState = {
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      userEmail: null,
      userName: null,
    };
    // Garder HAS_GRANTED_CONSENT pour que tryAutoRefresh fonctionne
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
    localStorage.removeItem(STORAGE_KEYS.USER_NAME);
    this.notifyListeners();
  }

  // ─── Token Expiration ────────────────────────────────────────────────

  private startTokenExpirationCheck(): void {
    setInterval(() => {
      if (!this.authState.expiresAt) return;

      const timeUntilExpiry = this.authState.expiresAt - Date.now();

      if (timeUntilExpiry <= 0) {
        this.silentRefresh().catch(() => {
          console.log('Token Google Drive expiré, silent refresh échoué');
          this.clearAuthState();
        });
      } else if (timeUntilExpiry <= REFRESH_MARGIN_MS) {
        this.silentRefresh().catch(() => {
          // On réessaiera au prochain cycle
        });
      }
    }, 60000);
  }

  // ─── Listeners ───────────────────────────────────────────────────────

  public addAuthStateListener(listener: (state: GoogleAuthState) => void): void {
    this.listeners.push(listener);
  }

  public removeAuthStateListener(
    listener: (state: GoogleAuthState) => void
  ): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.authState));
  }

  // ─── Public Getters ──────────────────────────────────────────────────

  public getAuthState(): GoogleAuthState {
    return { ...this.authState };
  }

  public isAuthenticated(): boolean {
    return (
      this.authState.isAuthenticated &&
      this.authState.accessToken !== null &&
      this.authState.expiresAt !== null &&
      Date.now() < this.authState.expiresAt
    );
  }

  public getAccessToken(): string {
    if (!this.isAuthenticated() || !this.authState.accessToken) {
      throw new BackupError(
        BackupErrorCode.AUTH_FAILED,
        'Non authentifié avec Google Drive'
      );
    }
    return this.authState.accessToken;
  }

  // ─── Sign In (Implicit Flow via popup avec consent) ───────────────────

  public async signIn(): Promise<void> {
    if (!GOOGLE_CLIENT_ID) {
      throw new BackupError(
        BackupErrorCode.AUTH_FAILED,
        'GOOGLE_CLIENT_ID non configuré. Veuillez configurer la variable d\'environnement VITE_GOOGLE_CLIENT_ID'
      );
    }

    try {
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'token',
        scope: GOOGLE_DRIVE_SCOPES.join(' '),
        state: this.generateState(),
        prompt: 'consent',
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'Google Sign In',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new BackupError(
          BackupErrorCode.AUTH_FAILED,
          'Impossible d\'ouvrir la popup d\'authentification. Veuillez autoriser les popups.'
        );
      }

      const token = await this.pollPopupForToken(popup, 300000);

      // Récupérer les infos utilisateur
      let userEmail: string | null = null;
      let userName: string | null = null;
      try {
        const info = await this.fetchUserInfo(token.accessToken);
        userEmail = info.email;
        userName = info.name;
      } catch {
        // Continuer même sans les infos utilisateur
      }

      this.authState = {
        isAuthenticated: true,
        accessToken: token.accessToken,
        refreshToken: null,
        expiresAt: token.expiresAt,
        userEmail,
        userName,
      };
      this.saveAuthStateToStorage();
      this.notifyListeners();

      // Marquer le consentement pour permettre le silent refresh
      localStorage.setItem(STORAGE_KEYS.HAS_GRANTED_CONSENT, 'true');
    } catch (error) {
      console.error('Erreur d\'authentification Google:', error);
      if (error instanceof BackupError) {
        throw error;
      }
      throw new BackupError(
        BackupErrorCode.AUTH_FAILED,
        'Échec de l\'authentification Google',
        error as Error
      );
    }
  }

  // ─── Silent Refresh (popup avec prompt=none) ──────────────────────────

  private async silentRefresh(): Promise<void> {
    // Garde de concurrence
    if (this.silentRefreshPromise) return this.silentRefreshPromise;

    this.silentRefreshPromise = this.doSilentRefresh().finally(() => {
      this.silentRefreshPromise = null;
    });

    return this.silentRefreshPromise;
  }

  private async doSilentRefresh(): Promise<void> {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'token',
      scope: GOOGLE_DRIVE_SCOPES.join(' '),
      state: this.generateState(),
      prompt: 'none',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    // Popup minimale positionnée hors de la vue
    const popup = window.open(
      authUrl,
      'Google Silent Refresh',
      'width=1,height=1,left=-100,top=-100'
    );

    if (!popup) {
      throw new BackupError(
        BackupErrorCode.TOKEN_EXPIRED,
        'Popup de rafraîchissement bloquée'
      );
    }

    const token = await this.pollPopupForToken(popup, 10000);

    this.authState = {
      ...this.authState,
      isAuthenticated: true,
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
    };
    this.saveAuthStateToStorage();
    this.notifyListeners();
  }

  // ─── Méthode commune : polling du popup pour extraire le token ────────

  private pollPopupForToken(
    popup: Window,
    timeoutMs: number
  ): Promise<{ accessToken: string; expiresAt: number }> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(checkInterval);
            reject(
              new BackupError(
                BackupErrorCode.AUTH_FAILED,
                'Authentification annulée par l\'utilisateur'
              )
            );
            return;
          }

          let popupUrl: string;
          try {
            popupUrl = popup.location.href;
          } catch {
            // Cross-origin, popup pas encore sur notre domaine
            return;
          }

          if (popupUrl.startsWith(GOOGLE_REDIRECT_URI)) {
            clearInterval(checkInterval);
            popup.close();

            // Parser les paramètres du hash fragment
            const hashParams = new URLSearchParams(
              popupUrl.split('#')[1] || ''
            );
            const accessToken = hashParams.get('access_token');
            const expiresIn = hashParams.get('expires_in');
            const error = hashParams.get('error');

            if (error) {
              reject(
                new BackupError(
                  BackupErrorCode.AUTH_FAILED,
                  `Erreur OAuth: ${error}`
                )
              );
              return;
            }

            if (!accessToken || !expiresIn) {
              reject(
                new BackupError(
                  BackupErrorCode.AUTH_FAILED,
                  'Token d\'accès non reçu'
                )
              );
              return;
            }

            const expiresAt = Date.now() + parseInt(expiresIn, 10) * 1000;
            resolve({ accessToken, expiresAt });
          }
        } catch {
          // Erreur cross-origin, continuer à attendre
        }
      }, 500);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (!popup.closed) {
          popup.close();
        }
        reject(
          new BackupError(
            BackupErrorCode.TOKEN_EXPIRED,
            'Timeout d\'authentification'
          )
        );
      }, timeoutMs);
    });
  }

  // ─── Auto Refresh au démarrage ───────────────────────────────────────

  public async tryAutoRefresh(): Promise<void> {
    if (this.isAuthenticated()) return;

    const hasConsented = localStorage.getItem(STORAGE_KEYS.HAS_GRANTED_CONSENT);
    if (!hasConsented) return;

    await this.silentRefresh();
  }

  // ─── Ensure Valid Token ──────────────────────────────────────────────

  public async ensureValidToken(): Promise<void> {
    if (this.isAuthenticated()) {
      if (
        this.authState.expiresAt &&
        this.authState.expiresAt - Date.now() < 60000
      ) {
        try {
          await this.silentRefresh();
        } catch {
          // Token encore valide, on continue
        }
      }
      return;
    }

    // Token expiré, tenter un silent refresh
    const hasConsented = localStorage.getItem(STORAGE_KEYS.HAS_GRANTED_CONSENT);
    if (hasConsented) {
      await this.silentRefresh();
      return;
    }

    throw new BackupError(
      BackupErrorCode.TOKEN_EXPIRED,
      'Token expiré. Veuillez vous reconnecter.'
    );
  }

  // ─── User Info ───────────────────────────────────────────────────────

  private async fetchUserInfo(
    accessToken: string
  ): Promise<{ email: string; name: string }> {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      throw new Error('Impossible de récupérer les informations utilisateur');
    }

    const data = await response.json();
    return {
      email: data.email || '',
      name: data.name || '',
    };
  }

  // ─── CSRF State ──────────────────────────────────────────────────────

  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      ''
    );
  }

  // ─── Sign Out ────────────────────────────────────────────────────────

  public async signOut(): Promise<void> {
    if (this.authState.accessToken) {
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${this.authState.accessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        );
      } catch (error) {
        console.error('Erreur lors de la révocation du token:', error);
      }
    }

    localStorage.removeItem(STORAGE_KEYS.HAS_GRANTED_CONSENT);
    this.clearAuthState();
  }
}

// Export d'une instance singleton
export const googleAuthService = GoogleAuthService.getInstance();
