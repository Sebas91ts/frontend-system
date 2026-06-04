import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { DocumentMetadata } from '../models/document-lifecycle.models';
import { Tag, TagCreateRequest, TagUpdateRequest } from '../models/tag.models';

@Injectable({
  providedIn: 'root',
})
export class TagService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  create(request: TagCreateRequest): Observable<ApiResponse<Tag>> {
    return this.http.post<ApiResponse<Tag>>(`${this.apiUrl}/tags`, request);
  }

  list(): Observable<ApiResponse<Tag[]>> {
    return this.http.get<ApiResponse<Tag[]>>(`${this.apiUrl}/tags`);
  }

  getById(tagId: string): Observable<ApiResponse<Tag>> {
    return this.http.get<ApiResponse<Tag>>(`${this.apiUrl}/tags/${encodeURIComponent(tagId)}`);
  }

  update(tagId: string, request: TagUpdateRequest): Observable<ApiResponse<Tag>> {
    return this.http.put<ApiResponse<Tag>>(`${this.apiUrl}/tags/${encodeURIComponent(tagId)}`, request);
  }

  delete(tagId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/tags/${encodeURIComponent(tagId)}`);
  }

  addToDocument(documentId: string, tagId: string): Observable<ApiResponse<DocumentMetadata>> {
    return this.http.post<ApiResponse<DocumentMetadata>>(
      `${this.apiUrl}/documents/${encodeURIComponent(documentId)}/tags/${encodeURIComponent(tagId)}`,
      {},
    );
  }

  removeFromDocument(documentId: string, tagId: string): Observable<ApiResponse<DocumentMetadata>> {
    return this.http.delete<ApiResponse<DocumentMetadata>>(
      `${this.apiUrl}/documents/${encodeURIComponent(documentId)}/tags/${encodeURIComponent(tagId)}`,
    );
  }
}
