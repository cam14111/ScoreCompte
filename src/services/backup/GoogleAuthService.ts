/**
 * Service d'authentification Google OAuth 2.0 (côté client)
 * Utilise le flux Authorization Code avec PKCE pour obtenir un refresh token
 * et maintenir une connexion persistante.
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
  REFRESH_TOKEN: 'google_drive_refresh_token',
  EXPIRES_AT: 'google_drive_expires_at',
  USER_EMAIL: 'google_drive_user_email',
  USER_NAME: 'google_drive_user_name',
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
  private refreshPromise: Promise<void> | null = null;
  private codeVerifier: string | null = null;

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

  // ─── PKCE Utilities ──────────────────────────────────────────────────

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64UrlEncode(new Uint8Array(digest));
  }

  private base64UrlEncode(bytes: Uint8Array): string {
    const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    return btoa(binString)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // ─── Storage ─────────────────────────────────────────────────────────

  private loadAuthStateFromStorage(): void {
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
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
          refreshToken,
          expiresAt: expiresAtNum,
          userEmail,
          userName,
        };
      } else if (refreshToken) {
        // Access token expiré mais refresh token disponible
        // On garde le refresh token, tryAutoRefresh() sera appelé au démarrage
        this.authState = {
          isAuthenticated: false,
          accessToken: null,
          refreshToken,
          expiresAt: null,
          userEmail,
          userName,
        };
      } else {
        this.clearAuthState();
      }
    } else if (refreshToken) {
      // Pas d'access token mais un refresh token existe
      this.authState = {
        isAuthenticated: false,
        accessToken: null,
        refreshToken,
        expiresAt: null,
        userEmail: localStorage.getItem(STORAGE_KEYS.USER_EMAIL),
        userName: localStorage.getItem(STORAGE_KEYS.USER_NAME),
      };
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
    if (this.authState.refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, this.authState.refreshToken);
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
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    this.notifyListeners();
  }

  // ─── Token Expiration ────────────────────────────────────────────────

  private startTokenExpirationCheck(): void {
    setInterval(() => {
      if (!this.authState.expiresAt) return;

      const timeUntilExpiry = this.authState.expiresAt - Date.now();

      if (timeUntilExpiry <= 0) {
        // Token expiré — tenter un refresh silencieux
        if (this.authState.refreshToken) {
          this.refreshAccessToken().catch(() => {
            console.log('Token Google Drive expiré, refresh échoué');
            this.clearAuthState();
          });
        } else {
          console.log('Token Google Drive expiré');
          this.clearAuthState();
        }
      } else if (timeUntilExpiry <= REFRESH_MARGIN_MS && this.authState.refreshToken) {
        // Rafraîchir proactivement 5 min avant expiration
        this.refreshAccessToken().catch(() => {
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

  // ─── Sign In (Authorization Code + PKCE) ─────────────────────────────

  public async signIn(): Promise<void> {
    if (!GOOGLE_CLIENT_ID) {
      throw new BackupError(
        BackupErrorCode.AUTH_FAILED,
        'GOOGLE_CLIENT_ID non configuré. Veuillez configurer la variable d\'environnement VITE_GOOGLE_CLIENT_ID'
      );
    }

    try {
      // Générer PKCE
      this.codeVerifier = this.generateCodeVerifier();
      const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: GOOGLE_DRIVE_SCOPES.join(' '),
        state: this.generateState(),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
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
    } catch (error) {
      this.codeVerifier = null;
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

  // ─── OAuth Callback (Authorization Code) ──────────────────────────────

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

            // Le code d'autorisation est dans les query params (pas le hash)
            const url = new URL(popupUrl);
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');

            if (error) {
              reject(
                new BackupError(
                  BackupErrorCode.AUTH_FAILED,
                  `Erreur OAuth: ${error}`
                )
              );
              return;
            }

            if (!code) {
              reject(
                new BackupError(
                  BackupErrorCode.AUTH_FAILED,
                  'Code d\'autorisation non reçu'
                )
              );
              return;
            }

            // Échanger le code contre des tokens
            this.exchangeCodeForTokens(code)
              .then(resolve)
              .catch(reject);
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

  // ─── Token Exchange ──────────────────────────────────────────────────

  private async exchangeCodeForTokens(code: string): Promise<void> {
    if (!this.codeVerifier) {
      throw new BackupError(
        BackupErrorCode.AUTH_FAILED,
        'Code verifier manquant'
      );
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        code,
        code_verifier: this.codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    this.codeVerifier = null;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new BackupError(
        BackupErrorCode.AUTH_FAILED,
        `Échec de l'échange de token: ${errorData.error_description || response.statusText}`
      );
    }

    const data = await response.json();
    const accessToken: string = data.access_token;
    const refreshToken: string | undefined = data.refresh_token;
    const expiresIn: number = data.expires_in;
    const expiresAt = Date.now() + expiresIn * 1000;

    // Récupérer les informations utilisateur
    let userEmail: string | null = null;
    let userName: string | null = null;
    try {
      const userInfo = await this.fetchUserInfo(accessToken);
      userEmail = userInfo.email;
      userName = userInfo.name;
    } catch {
      // Continuer même sans les infos utilisateur
    }

    this.authState = {
      isAuthenticated: true,
      accessToken,
      refreshToken: refreshToken || this.authState.refreshToken,
      expiresAt,
      userEmail,
      userName,
    };
    this.saveAuthStateToStorage();
    this.notifyListeners();
  }

  // ─── Token Refresh ───────────────────────────────────────────────────

  private async refreshAccessToken(): Promise<void> {
    // Garde de concurrence : une seule requête de refresh à la fois
    if (this.refreshPromise) return this.refreshPromise;

    this.refreshPromise = this.doRefreshAccessToken().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async doRefreshAccessToken(): Promise<void> {
    const refreshToken = this.authState.refreshToken;
    if (!refreshToken) {
      throw new BackupError(
        BackupErrorCode.TOKEN_EXPIRED,
        'Pas de refresh token disponible'
      );
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      // 400/401 = token révoqué ou expiré
      if (response.status === 400 || response.status === 401) {
        this.clearAuthState();
        throw new BackupError(
          BackupErrorCode.TOKEN_EXPIRED,
          'Refresh token invalide. Veuillez vous reconnecter.'
        );
      }
      throw new BackupError(
        BackupErrorCode.NETWORK_ERROR,
        `Échec du refresh: ${response.statusText}`
      );
    }

    const data = await response.json();
    const accessToken: string = data.access_token;
    const expiresIn: number = data.expires_in;

    this.authState = {
      ...this.authState,
      isAuthenticated: true,
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    this.saveAuthStateToStorage();
    this.notifyListeners();
  }

  /**
   * Tenter un rafraîchissement silencieux au démarrage de l'app.
   * Ne lance pas d'erreur si aucun refresh token n'est disponible.
   */
  public async tryAutoRefresh(): Promise<void> {
    if (this.isAuthenticated()) return;
    if (!this.authState.refreshToken) return;

    await this.refreshAccessToken();
  }

  // ─── Ensure Valid Token ──────────────────────────────────────────────

  public async ensureValidToken(): Promise<void> {
    if (this.isAuthenticated()) {
      // Rafraîchir proactivement si proche de l'expiration
      if (
        this.authState.expiresAt &&
        this.authState.refreshToken &&
        this.authState.expiresAt - Date.now() < 60000
      ) {
        await this.refreshAccessToken();
      }
      return;
    }

    // Token expiré, tenter un refresh
    if (this.authState.refreshToken) {
      await this.refreshAccessToken();
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

    this.clearAuthState();
  }
}

// Export d'une instance singleton
export const googleAuthService = GoogleAuthService.getInstance();
