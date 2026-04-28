import { Injectable, signal, computed, Signal, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, map, of } from 'rxjs';
import { Usuario, AuthResponse, LoginRequest, RegisterRequest, ApiResponse } from '../models/auth.models';
import { API_BASE_URL } from '../config/api.config';
import { RealtimeService } from './realtime.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private static readonly TOKEN_STORAGE_KEY = 'systembpm_auth_token';
  private currentUserSignal = signal<Usuario | null>(null);
  private sessionCheckedSignal = signal(false);
  public readonly currentUser: Signal<Usuario | null> = this.currentUserSignal;
  public readonly isAuthenticated: Signal<boolean> = computed(() => !!this.currentUserSignal());
  public readonly sessionChecked: Signal<boolean> = this.sessionCheckedSignal;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
    private realtimeService: RealtimeService,
  ) {}

  login(loginRequest: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(
      `${this.apiUrl}/auth/login`,
      loginRequest,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          if (response.data.token) {
            localStorage.setItem(AuthService.TOKEN_STORAGE_KEY, response.data.token);
          }
          this.currentUserSignal.set(response.data.usuario);
          this.realtimeService.connectForUser(response.data.usuario);
        }
      }),
      catchError(error => {
        console.error('Error en login:', error);
        return throwError(() => error);
      })
    );
  }

  register(registerRequest: RegisterRequest): Observable<ApiResponse<Usuario>> {
    return this.http.post<ApiResponse<Usuario>>(
      `${this.apiUrl}/auth/register`,
      registerRequest,
      { withCredentials: true }
    ).pipe(
      catchError(error => {
        console.error('Error en registro:', error);
        return throwError(() => error);
      })
    );
  }

  restoreSession(): Observable<boolean> {
    const token = this.getToken();
    if (!token) {
      this.currentUserSignal.set(null);
      this.sessionCheckedSignal.set(true);
      this.realtimeService.disconnect();
      return of(false);
    }

    return this.http.get<ApiResponse<Usuario>>(`${this.apiUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          this.currentUserSignal.set(response.data);
          this.sessionCheckedSignal.set(true);
          this.realtimeService.connectForUser(response.data);
          return true;
        }

        this.currentUserSignal.set(null);
        this.sessionCheckedSignal.set(true);
        this.realtimeService.disconnect();
        return false;
      }),
      catchError(() => {
        this.currentUserSignal.set(null);
        this.sessionCheckedSignal.set(true);
        this.realtimeService.disconnect();
        return of(false);
      })
    );
  }

  ensureSession(): Observable<boolean> {
    if (this.sessionCheckedSignal()) {
      return of(this.isAuthenticated());
    }

    return this.restoreSession();
  }

  logout(): void {
    this.http.delete<ApiResponse<void>>(`${this.apiUrl}/auth/logout`, {
      withCredentials: true
    }).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      localStorage.removeItem(AuthService.TOKEN_STORAGE_KEY);
      this.currentUserSignal.set(null);
      this.realtimeService.disconnect();
      this.router.navigate(['/auth/login']);
    });
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSignal();
    if (!user) return false;
    return user.roles.includes(role);
  }

  isAdmin(): boolean {
    return this.hasRole('ROLE_ADMIN');
  }

  isClient(): boolean {
    return this.hasRole('ROLE_CLIENT');
  }

  getLandingRoute(): string[] {
    if (this.isClient()) {
      return ['/client/home'];
    }

    if (this.isAdmin()) {
      return ['/admin'];
    }

    return ['/user'];
  }

  getToken(): string | null {
    return localStorage.getItem(AuthService.TOKEN_STORAGE_KEY);
  }
}
