import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, from, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { FirebaseService } from './firebase.service';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';

export interface AuthUser {
  id: string | number;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private firebase = inject(FirebaseService);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'importadora_token';
  private readonly USER_KEY = 'importadora_user';
  public readonly adminEmail = environment.adminEmail.toLowerCase();

  currentUser = signal<AuthUser | null>(this.getStoredUser());
  isAuthenticated = signal<boolean>(!!this.getToken());

  constructor() {
    if (this.firebase.isConfigured() && this.firebase.auth) {
      onAuthStateChanged(this.firebase.auth, (fbUser) => {
        if (fbUser) {
          const email = fbUser.email?.toLowerCase() || '';
          if (email === this.adminEmail) {
            const user: AuthUser = {
              id: fbUser.uid,
              name: fbUser.displayName || 'Administrador',
              email: fbUser.email || this.adminEmail,
              role: 'admin',
            };
            this.setSession(fbUser.uid, user);
          } else {
            this.clearSession();
          }
        } else {
          // Si no hay sesión activa en Firebase y estábamos con token de Firebase, limpiar
          const stored = this.getStoredUser();
          if (stored && stored.id && typeof stored.id === 'string' && stored.id.length > 20) {
            this.clearSession();
          }
        }
      });
    }
  }

  /**
   * Iniciar sesión con Correo Electrónico y Contraseña
   */
  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    const emailInput = credentials.email.trim().toLowerCase();

    // 1. Si Firebase está activo
    if (this.firebase.isConfigured() && this.firebase.auth) {
      return from(
        signInWithEmailAndPassword(this.firebase.auth, credentials.email, credentials.password)
      ).pipe(
        map((userCred) => {
          const fbUser = userCred.user;
          const userEmail = (fbUser.email || '').toLowerCase();

          // Validar que el correo sea el del administrador
          if (userEmail !== this.adminEmail) {
            signOut(this.firebase.auth!);
            this.clearSession();
            throw new Error(
              `Acceso denegado: El correo "${userEmail}" no está autorizado. Solo ${this.adminEmail} tiene acceso de administrador.`
            );
          }

          const authUser: AuthUser = {
            id: fbUser.uid,
            name: fbUser.displayName || 'Administrador Beymar',
            email: fbUser.email || this.adminEmail,
            role: 'admin',
          };

          this.setSession(fbUser.uid, authUser);

          return {
            message: 'Autenticación exitosa con Firebase',
            token: fbUser.uid,
            user: authUser,
          };
        }),
        catchError((err) => {
          let errorMsg = err.message || 'Error de autenticación.';
          if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            errorMsg = 'Correo electrónico o contraseña incorrectos en Firebase.';
          } else if (err.code === 'auth/too-many-requests') {
            errorMsg = 'Demasiados intentos fallidos. Por favor espera unos minutos.';
          }
          return throwError(() => ({ message: errorMsg, original: err }));
        })
      );
    }

    // 2. Modo Local / Pre-configuración (permite probar sin configurar las credenciales de inmediato)
    if (emailInput === this.adminEmail || emailInput === 'admin@importadora.com') {
      const mockUser: AuthUser = {
        id: 'admin_local_id',
        name: 'Administrador (Modo Demostración)',
        email: this.adminEmail,
        role: 'admin',
      };
      this.setSession('token_demo_local_123', mockUser);
      return of({
        message: 'Acceso en modo local activo',
        token: 'token_demo_local_123',
        user: mockUser,
      });
    }

    return throwError(() => ({
      message: `El correo debe ser ${this.adminEmail} para acceder como administrador.`,
    }));
  }

  /**
   * Iniciar sesión directamente con Google (con 1 solo clic usando la cuenta de Google)
   */
  loginWithGoogle(): Observable<LoginResponse> {
    if (!this.firebase.isConfigured() || !this.firebase.auth) {
      return throwError(() => ({
        message: 'Para usar inicio de sesión con Google, debes agregar tus credenciales de Firebase en environment.ts.',
      }));
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    return from(signInWithPopup(this.firebase.auth, provider)).pipe(
      map((result) => {
        const fbUser = result.user;
        const userEmail = (fbUser.email || '').toLowerCase();

        if (userEmail !== this.adminEmail) {
          signOut(this.firebase.auth!);
          this.clearSession();
          throw new Error(
            `Acceso denegado: La cuenta de Google "${userEmail}" no coincide con el administrador autorizado (${this.adminEmail}).`
          );
        }

        const authUser: AuthUser = {
          id: fbUser.uid,
          name: fbUser.displayName || 'Administrador',
          email: fbUser.email || this.adminEmail,
          role: 'admin',
        };

        this.setSession(fbUser.uid, authUser);

        return {
          message: 'Autenticación con Google exitosa',
          token: fbUser.uid,
          user: authUser,
        };
      }),
      catchError((err) => {
        let msg = err.message || 'Error al iniciar sesión con Google.';
        if (err.code === 'auth/popup-closed-by-user') {
          msg = 'La ventana de autenticación de Google fue cerrada antes de completar el inicio de sesión.';
        }
        return throwError(() => ({ message: msg, original: err }));
      })
    );
  }

  logout(): void {
    if (this.firebase.isConfigured() && this.firebase.auth) {
      signOut(this.firebase.auth).finally(() => this.clearSession());
    } else {
      this.clearSession();
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setSession(token: string, user: AuthUser): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
  }

  private getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/admin/login']);
  }
}
