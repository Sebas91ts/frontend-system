import { Inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { DocumentLifecycleActionRequest, DocumentMetadata } from '../models/document-lifecycle.models';

@Injectable({
  providedIn: 'root',
})
export class DocumentLifecycleService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  approve(documentId: string, request: DocumentLifecycleActionRequest = {}): Observable<ApiResponse<DocumentMetadata>> {
    return this.http.post<ApiResponse<DocumentMetadata>>(`${this.apiUrl}/documents/${encodeURIComponent(documentId)}/approve`, request);
  }

  reject(documentId: string, request: DocumentLifecycleActionRequest = {}): Observable<ApiResponse<DocumentMetadata>> {
    return this.http.post<ApiResponse<DocumentMetadata>>(`${this.apiUrl}/documents/${encodeURIComponent(documentId)}/reject`, request);
  }

  lock(documentId: string): Observable<ApiResponse<DocumentMetadata>> {
    return this.http.post<ApiResponse<DocumentMetadata>>(`${this.apiUrl}/documents/${encodeURIComponent(documentId)}/lock`, {});
  }

  unlock(documentId: string): Observable<ApiResponse<DocumentMetadata>> {
    return this.http.post<ApiResponse<DocumentMetadata>>(`${this.apiUrl}/documents/${encodeURIComponent(documentId)}/unlock`, {});
  }

  getByTask(processInstanceId: string, taskDefinitionKey: string, taskInstanceId?: string): Observable<ApiResponse<DocumentMetadata[]>> {
    let params = new HttpParams();
    if (taskInstanceId) {
      params = params.set('taskInstanceId', taskInstanceId);
    }
    return this.http.get<ApiResponse<DocumentMetadata[]>>(
      `${this.apiUrl}/documents/task/${encodeURIComponent(processInstanceId)}/${encodeURIComponent(taskDefinitionKey)}`,
      { params },
    );
  }

  getPending(processInstanceId?: string): Observable<ApiResponse<DocumentMetadata[]>> {
    let params = new HttpParams();
    if (processInstanceId) {
      params = params.set('processInstanceId', processInstanceId);
    }
    return this.http.get<ApiResponse<DocumentMetadata[]>>(`${this.apiUrl}/documents/pending`, { params });
  }
}
