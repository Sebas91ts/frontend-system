import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { OnlyOfficeEditingSession, OnlyOfficeEditorConfig } from '../models/onlyoffice.models';

@Injectable({
  providedIn: 'root',
})
export class OnlyOfficeService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  getEditorConfig(documentId: string): Observable<ApiResponse<OnlyOfficeEditorConfig>> {
    return this.http.get<ApiResponse<OnlyOfficeEditorConfig>>(
      `${this.apiUrl}/documents/${encodeURIComponent(documentId)}/editor-config`,
    );
  }

  startEditing(documentId: string): Observable<ApiResponse<OnlyOfficeEditingSession>> {
    return this.http.post<ApiResponse<OnlyOfficeEditingSession>>(
      `${this.apiUrl}/documents/${encodeURIComponent(documentId)}/start-editing`,
      {},
    );
  }

  finishEditing(documentId: string): Observable<ApiResponse<OnlyOfficeEditingSession>> {
    return this.http.post<ApiResponse<OnlyOfficeEditingSession>>(
      `${this.apiUrl}/documents/${encodeURIComponent(documentId)}/finish-editing`,
      {},
    );
  }
}
