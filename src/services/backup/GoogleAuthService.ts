/**
 * Service d'authentification Google OAuth 2.0 (côté client)
 * Utilise le flux OAuth 2.0 Implicit Flow pour applications SPA
 */

import {
  GoogleAuthState,
  GOOGLE_DRIVE_SCOPES,
  BackupError,
  BackupErrorCode,
} from './types';

// Configuration OAuth (à remplacer par vos propres valeurs)
// IMPORTANT: Ces valeurs doivent être configurées dans Google Cloud Console
const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI =
  (import.meta as any).env?.VITE_GOOGLE_REDIRECT_URI || window.location.origin;

// Clés de stockage localStorage
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'google_drive_access_token',
  EXPIRES_AT: 'google_drive_expires_at',
  USER_EMAIL: 'google_drive_user_email',
  USER_NAME: 'google_drive_user_name',
};

export class GoogleAuthService {
  private static instance: GoogleAuthService;
  private authState: GoogleAuthState = {
    isAuthenticated: false,
    accessToken: null,
    expiresAt: null,
    userEmail: null,
    userName: null,
  };
  private listeners: Array<(state: GoogleAuthState) => void> = [];

  private constructor() {
    this.loadAuthStateFromStorage();
    this.checkTokenExpiration();
  }

  /**
   * Singleton instance
   */
  public static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  /**
   * Charger l'état d'authentification depuis localStorage
   */
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
          expiresAt: expiresAtNum,
          userEmail,
          userName,
        };
      } else {
        this.clearAuthState();
      }
    }
  }

  /**
   * Sauvegarder l'état d'authentification dans localStorage
   */
  private saveAuthStateToStorage(): void {
    if (this.authState.accessToken && this.authState.expiresAt) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, this.authState.accessToken);
      localStorage.setItem(
        STORAGE_KEYS.EXPIRES_AT,
        this.authState.expiresAt.toString()
      );
      if (this.authState.userEmail) {
        localStorage.setItem(STORAGE_KEYS.USER_EMAIL, this.authState.userEmail);
      }
      if (this.authState.userName) {
        localStorage.setItem(STORAGE_KEYS.USER_NAME, this.authState.userName);
      }
    }
  }

  /**
   * Effacer l'état d'authentification du stockage
   */
  private clearAuthState(): void {
    this.authState = {
      isAuthenticated: false,
      accessToken: null,
      expiresAt: null,
      userEmail: null,
      userName: null,
    };
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    this.notifyListeners();
  }

  /**
   * Vérifier périodiquement l'expiration du token
   */
  private checkTokenExpiration(): void {
    setInterval(() => {
      if (this.authState.expiresAt && Date.now() >= this.authState.expiresAt) {
        console.log('Token Google Drive expiré');
        this.clearAuthState();
      }
    }, 60000); // Vérifier toutes les minutes
  }

  /**
   * Ajouter un listener pour les changements d'état d'auth
   */
  public addAuthStateListener(listener: (state: GoogleAuthState) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Retirer un listener
   */
  public removeAuthStateListener(
    listener: (state: GoogleAuthState) => void
  ): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  /**
   * Notifier les listeners d'un changement d'état
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.authState));
  }

  /**
   * Obtenir l'état d'authentification actuel
   */
  public getAuthState(): GoogleAuthState {
    return { ...this.authState };
  }

  /**
   * Vérifier si l'utilisateur est authentifié
   */
  public isAuthenticated(): boolean {
    return (
      this.authState.isAuthenticated &&
      this.authState.accessToken !== null &&
      this.authState.expiresAt !== null &&
      Date.now() < this.authState.expiresAt
    );
  }

  /**
   * Obtenir le token d'accès (lance une erreur si non authentifié)
   */
  public getAccessToken(): string {
    if (!this.isAuthenticated() || !this.authState.accessToken) {
      throw new BackupError(
        BackupErrorCode.AUTH_FAILED,
        'Non authentifié avec Google Drive'
      );
    }
    return this.authState.accessToken;
  }

  /**
   * Se connecter avec Google OAuth 2.0 (Implicit Flow)
   * Ouvre une popup pour l'authentification
   */
  public async signIn(): Promise<void> {
    if (!GOOGLE_CLIENT_ID) {
      throw new BackupError(
        BackupErrorCode.AUTH_FAILED,
        'GOOGLE_CLIENT_ID non configuré. Veuillez configurer la variable d\'environnement VITE_GOOGLE_CLIENT_ID'
      );
    }

    try {
      // Construction de l'URL OAuth 2.0
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'token',
        scope: GOOGLE_DRIVE_SCOPES.join(' '),
        state: this.generateState(),
        prompt: 'consent',
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      // Ouvrir popup d'authentification
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

      // Attendre la réponse OAuth dans l'URL de redirection
      await this.waitForOAuthCallback(popup);
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

  /**
   * Attendre le callback OAuth depuis la popup
   */
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

          // Vérifier si la popup a été redirigée vers notre domaine
          let popupUrl: string;
          try {
            popupUrl = popup.location.href;
          } catch {
            // Cross-origin error, popup n'est pas encore sur notre domaine
            return;
          }

          if (popupUrl.startsWith(GOOGLE_REDIRECT_URI)) {
            clearInterval(checkInterval);
            popup.close();

            // Parser les paramètres de l'URL (hash fragment)
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

            // Calculer la date d'expiration
            const expiresAt = Date.now() + parseInt(expiresIn, 10) * 1000;

            // Récupérer les informations utilisateur
            this.fetchUserInfo(accessToken)
              .then(({ email, name }) => {
                this.authState = {
                  isAuthenticated: true,
                  accessToken,
                  expiresAt,
                  userEmail: email,
                  userName: name,
                };
                this.saveAuthStateToStorage();
                this.notifyListeners();
                resolve();
              })
              .catch(() => {
                // Même si on ne peut pas récupérer les infos, on est authentifié
                this.authState = {
                  isAuthenticated: true,
                  accessToken,
                  expiresAt,
                  userEmail: null,
                  userName: null,
                };
                this.saveAuthStateToStorage();
                this.notifyListeners();
                resolve();
              });
          }
        } catch (err) {
          // Erreur de cross-origin, continuer à attendre
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

  /**
   * Récupérer les informations de l'utilisateur via l'API Google
   */
  private async fetchUserInfo(
    accessToken: string
  ): Promise<{ email: string; name: string }> {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
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

  /**
   * Générer un state aléatoire pour OAuth (sécurité CSRF)
   */
  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      ''
    );
  }

  /**
   * Se déconnecter et révoquer le token
   */
  public async signOut(): Promise<void> {
    if (this.authState.accessToken) {
      try {
        // Révoquer le token via l'API Google
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${this.authState.accessToken}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
      } catch (error) {
        console.error('Erreur lors de la révocation du token:', error);
        // Continuer quand même la déconnexion locale
      }
    }

    this.clearAuthState();
  }

  /**
   * Vérifier la validité du token et le rafraîchir si nécessaire
   * Note: OAuth 2.0 Implicit Flow ne supporte pas le refresh token
   * L'utilisateur devra se reconnecter manuellement
   */
  public async ensureValidToken(): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new BackupError(
        BackupErrorCode.TOKEN_EXPIRED,
        'Token expiré. Veuillez vous reconnecter.'
      );
    }
  }
}

// Export d'une instance singleton
export const googleAuthService = GoogleAuthService.getInstance();
