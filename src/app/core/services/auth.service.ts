import { Injectable, signal, computed, Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Usuario, AuthResponse, LoginRequest, RegisterRequest, ApiResponse } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  private readonly API_URL = 'http://localhost:8080/api';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'current_user';

  // Signals para estado reactivo
  private currentUserSignal = signal<Usuario | null>(this.loadUserFromStorage());
  public readonly currentUser: Signal<Usuario | null> = this.currentUserSignal;
  public readonly isAuthenticated: Signal<boolean> = computed(() => !!this.currentUserSignal());

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(loginRequest: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(
      `${this.API_URL}/auth/login`, 
      loginRequest
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setAuth(response.data);
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
      registerRequest
    ).pipe(
      catchError(error => {
        console.error('Error en registro:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSignal.set(null);
    this.router.navigate(['/auth/login']);
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
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private setAuth(authResponse: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, `${authResponse.tokenType} ${authResponse.token}`);
    localStorage.setItem(this.USER_KEY, JSON.stringify(authResponse.usuario));
    this.currentUserSignal.set(authResponse.usuario);
  }

  private loadUserFromStorage(): Usuario | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
}
