/**
 * Service d'authentification Google OAuth 2.0 (côté client)
 * Utilise l'Implicit Flow avec rafraîchissement silencieux par iframe cachée
 * pour maintenir une connexion persistante sans client_secret.
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
// Timeout pour le silent refresh via iframe (10 secondes)
const SILENT_REFRESH_TIMEOUT_MS = 10000;

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
        // Token expiré — tenter un silent refresh
        this.silentRefresh().catch(() => {
          console.log('Token Google Drive expiré, silent refresh échoué');
          this.clearAuthState();
        });
      } else if (timeUntilExpiry <= REFRESH_MARGIN_MS) {
        // Rafraîchir proactivement 5 min avant expiration
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

  // ─── Sign In (Implicit Flow via popup) ────────────────────────────────

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

      await this.waitForOAuthCallback(popup);

      // Marquer que l'utilisateur a déjà donné son consentement
      // pour permettre le silent refresh à l'avenir
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

  // ─── OAuth Callback (Implicit Flow — hash fragment) ───────────────────

  private waitForOAuthCallback(popup: Window): Promise<void> {
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

            this.fetchUserInfo(accessToken)
              .then(({ email, name }) => {
                this.authState = {
                  isAuthenticated: true,
                  accessToken,
                  refreshToken: null,
                  expiresAt,
                  userEmail: email,
                  userName: name,
                };
                this.saveAuthStateToStorage();
                this.notifyListeners();
                resolve();
              })
              .catch(() => {
                this.authState = {
                  isAuthenticated: true,
                  accessToken,
                  refreshToken: null,
                  expiresAt,
                  userEmail: null,
                  userName: null,
                };
                this.saveAuthStateToStorage();
                this.notifyListeners();
                resolve();
              });
          }
        } catch {
          // Erreur cross-origin, continuer à attendre
        }
      }, 500);

      // Timeout après 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!popup.closed) {
          popup.close();
        }
        reject(
          new BackupError(
            BackupErrorCode.AUTH_FAILED,
            'Timeout d\'authentification'
          )
        );
      }, 300000);
    });
  }

  // ─── Silent Refresh (via iframe cachée) ───────────────────────────────

  /**
   * Rafraîchir le token silencieusement via une iframe cachée.
   * Fonctionne tant que l'utilisateur a une session Google active
   * et a déjà donné son consentement.
   */
  private async silentRefresh(): Promise<void> {
    // Garde de concurrence
    if (this.silentRefreshPromise) return this.silentRefreshPromise;

    this.silentRefreshPromise = this.doSilentRefresh().finally(() => {
      this.silentRefreshPromise = null;
    });

    return this.silentRefreshPromise;
  }

  private doSilentRefresh(): Promise<void> {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'token',
        scope: GOOGLE_DRIVE_SCOPES.join(' '),
        state: this.generateState(),
        prompt: 'none', // Pas d'interaction utilisateur
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.setAttribute('aria-hidden', 'true');

      const cleanup = () => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new BackupError(
          BackupErrorCode.TOKEN_EXPIRED,
          'Silent refresh timeout'
        ));
      }, SILENT_REFRESH_TIMEOUT_MS);

      iframe.addEventListener('load', () => {
        try {
          const iframeUrl = iframe.contentWindow?.location.href;
          if (!iframeUrl || !iframeUrl.startsWith(GOOGLE_REDIRECT_URI)) {
            clearTimeout(timeout);
            cleanup();
            reject(new BackupError(
              BackupErrorCode.TOKEN_EXPIRED,
              'Silent refresh: redirection inattendue'
            ));
            return;
          }

          const hashParams = new URLSearchParams(
            iframeUrl.split('#')[1] || ''
          );
          const accessToken = hashParams.get('access_token');
          const expiresIn = hashParams.get('expires_in');
          const error = hashParams.get('error');

          clearTimeout(timeout);
          cleanup();

          if (error || !accessToken || !expiresIn) {
            reject(new BackupError(
              BackupErrorCode.TOKEN_EXPIRED,
              `Silent refresh échoué: ${error || 'pas de token'}`
            ));
            return;
          }

          const expiresAt = Date.now() + parseInt(expiresIn, 10) * 1000;

          this.authState = {
            ...this.authState,
            isAuthenticated: true,
            accessToken,
            expiresAt,
          };
          this.saveAuthStateToStorage();
          this.notifyListeners();
          resolve();
        } catch {
          // Cross-origin error = Google n'a pas redirigé vers notre domaine
          // (session Google expirée ou consentement nécessaire)
          clearTimeout(timeout);
          cleanup();
          reject(new BackupError(
            BackupErrorCode.TOKEN_EXPIRED,
            'Silent refresh échoué: session Google inactive'
          ));
        }
      });

      document.body.appendChild(iframe);
      iframe.src = authUrl;
    });
  }

  /**
   * Tenter un rafraîchissement silencieux au démarrage de l'app.
   * Ne lance pas d'erreur visible — échoue silencieusement si
   * la session Google n'est plus active.
   */
  public async tryAutoRefresh(): Promise<void> {
    if (this.isAuthenticated()) return;

    // Ne tenter que si l'utilisateur avait déjà donné son consentement
    const hasConsented = localStorage.getItem(STORAGE_KEYS.HAS_GRANTED_CONSENT);
    if (!hasConsented) return;

    await this.silentRefresh();
  }

  // ─── Ensure Valid Token ──────────────────────────────────────────────

  public async ensureValidToken(): Promise<void> {
    if (this.isAuthenticated()) {
      // Rafraîchir proactivement si proche de l'expiration
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

    // Supprimer aussi le flag de consentement
    localStorage.removeItem(STORAGE_KEYS.HAS_GRANTED_CONSENT);
    this.clearAuthState();
  }
}

// Export d'une instance singleton
export const googleAuthService = GoogleAuthService.getInstance();
