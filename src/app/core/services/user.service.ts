import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse, Usuario } from '../models/auth.models';
import { RegisterRequest } from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  listarUsuarios(): Observable<ApiResponse<Usuario[]>> {
    console.info('[UserService] GET /api/users -> start', { apiUrl: this.apiUrl });

    return this.http.get<ApiResponse<Usuario[]>>(`${this.apiUrl}/users`).pipe(
      tap({
        next: (response) => console.info('[UserService] GET /api/users -> success', response),
        error: (error) => console.error('[UserService] GET /api/users -> error', error),
      }),
    );
  }

  registrarUsuarioAdmin(request: RegisterRequest): Observable<ApiResponse<Usuario>> {
    console.info('[UserService] POST /api/users -> start', { apiUrl: this.apiUrl });

    return this.http.post<ApiResponse<Usuario>>(`${this.apiUrl}/users`, request).pipe(
      tap({
        next: (response) => console.info('[UserService] POST /api/users -> success', response),
        error: (error) => console.error('[UserService] POST /api/users -> error', error),
      }),
    );
  }

  actualizarUsuario(id: string, request: RegisterRequest): Observable<ApiResponse<Usuario>> {
    console.info('[UserService] PUT /api/users/{id} -> start', { id, apiUrl: this.apiUrl });

    return this.http.put<ApiResponse<Usuario>>(`${this.apiUrl}/users/${id}`, request).pipe(
      tap({
        next: (response) => console.info('[UserService] PUT /api/users/{id} -> success', response),
        error: (error) => console.error('[UserService] PUT /api/users/{id} -> error', error),
      }),
    );
  }

  eliminarUsuario(id: string): Observable<ApiResponse<void>> {
    console.info('[UserService] DELETE /api/users/{id} -> start', { id, apiUrl: this.apiUrl });

    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/users/${id}`).pipe(
      tap({
        next: (response) => console.info('[UserService] DELETE /api/users/{id} -> success', response),
        error: (error) => console.error('[UserService] DELETE /api/users/{id} -> error', error),
      }),
    );
  }
}
