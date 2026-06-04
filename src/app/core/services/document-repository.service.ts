import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { DocumentMetadata } from '../models/document-lifecycle.models';
import { DocumentDownloadUrlResponse } from '../models/document-repository.models';

@Injectable({
  providedIn: 'root',
})
export class DocumentRepositoryService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  getById(documentId: string): Observable<ApiResponse<DocumentMetadata>> {
    return this.http.get<ApiResponse<DocumentMetadata>>(`${this.apiUrl}/documents/${encodeURIComponent(documentId)}`);
  }

  getDownloadUrl(documentId: string): Observable<ApiResponse<DocumentDownloadUrlResponse>> {
    return this.http.get<ApiResponse<DocumentDownloadUrlResponse>>(
      `${this.apiUrl}/documents/${encodeURIComponent(documentId)}/download-url`,
    );
  }
}
