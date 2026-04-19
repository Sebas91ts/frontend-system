import { Injectable, signal, computed, Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, map, of } from 'rxjs';
import { Usuario, AuthResponse, LoginRequest, RegisterRequest, ApiResponse } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8080/api';

  // Estado solo en memoria: evita persistir tokens/usuario en localStorage.
  private currentUserSignal = signal<Usuario | null>(null);
  private sessionCheckedSignal = signal(false);
  public readonly currentUser: Signal<Usuario | null> = this.currentUserSignal;
  public readonly isAuthenticated: Signal<boolean> = computed(() => !!this.currentUserSignal());
  public readonly sessionChecked: Signal<boolean> = this.sessionCheckedSignal;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(loginRequest: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(
      `${this.API_URL}/auth/login`,
      loginRequest,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.currentUserSignal.set(response.data.usuario);
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
      `${this.API_URL}/auth/register`,
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
    return this.http.get<ApiResponse<Usuario>>(`${this.API_URL}/auth/me`, {
      withCredentials: true
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          this.currentUserSignal.set(response.data);
          this.sessionCheckedSignal.set(true);
          return true;
        }

        this.currentUserSignal.set(null);
        this.sessionCheckedSignal.set(true);
        return false;
      }),
      catchError(() => {
        this.currentUserSignal.set(null);
        this.sessionCheckedSignal.set(true);
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
    this.http.delete<ApiResponse<void>>(`${this.API_URL}/auth/logout`, {
      withCredentials: true
    }).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.currentUserSignal.set(null);
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

  getToken(): string | null {
    return null;
  }
}
