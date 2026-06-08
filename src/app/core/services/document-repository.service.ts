import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import { DocumentMetadata } from '../models/document-lifecycle.models';
import { DocumentDownloadUrlResponse } from '../models/document-repository.models';

export type TaskDocumentUploadContext = {
  tenantId: string;
  processInstanceId: string;
  processKey?: string;
  processVersion?: number;
  taskDefinitionKey?: string;
  taskInstanceId?: string;
  documentRequirementId?: string;
};

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

  uploadTaskDocument(file: File, context: TaskDocumentUploadContext): Observable<ApiResponse<DocumentMetadata>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tenantId', context.tenantId);
    formData.append('processInstanceId', context.processInstanceId);
    this.appendIfPresent(formData, 'processKey', context.processKey);
    this.appendIfPresent(formData, 'processVersion', context.processVersion?.toString());
    this.appendIfPresent(formData, 'taskDefinitionKey', context.taskDefinitionKey);
    this.appendIfPresent(formData, 'taskInstanceId', context.taskInstanceId);
    this.appendIfPresent(formData, 'documentRequirementId', context.documentRequirementId);

    return this.http.post<ApiResponse<DocumentMetadata>>(`${this.apiUrl}/documents/upload`, formData);
  }

  private appendIfPresent(formData: FormData, key: string, value?: string): void {
    if (value && value.trim()) {
      formData.append(key, value);
    }
  }
}
