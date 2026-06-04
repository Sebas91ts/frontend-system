import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/auth.models';
import {
  Folder,
  FolderCreateRequest,
  FolderDocumentsResponse,
  FolderTreeNode,
  FolderUpdateRequest,
} from '../models/folder.models';

@Injectable({
  providedIn: 'root',
})
export class FolderService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiUrl: string,
  ) {}

  create(request: FolderCreateRequest): Observable<ApiResponse<Folder>> {
    return this.http.post<ApiResponse<Folder>>(`${this.apiUrl}/folders`, request);
  }

  list(): Observable<ApiResponse<Folder[]>> {
    return this.http.get<ApiResponse<Folder[]>>(`${this.apiUrl}/folders`);
  }

  tree(): Observable<ApiResponse<FolderTreeNode[]>> {
    return this.http.get<ApiResponse<FolderTreeNode[]>>(`${this.apiUrl}/folders/tree`);
  }

  getById(folderId: string): Observable<ApiResponse<Folder>> {
    return this.http.get<ApiResponse<Folder>>(`${this.apiUrl}/folders/${encodeURIComponent(folderId)}`);
  }

  update(folderId: string, request: FolderUpdateRequest): Observable<ApiResponse<Folder>> {
    return this.http.put<ApiResponse<Folder>>(`${this.apiUrl}/folders/${encodeURIComponent(folderId)}`, request);
  }

  delete(folderId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/folders/${encodeURIComponent(folderId)}`);
  }

  getDocuments(folderId: string): Observable<ApiResponse<FolderDocumentsResponse>> {
    return this.http.get<ApiResponse<FolderDocumentsResponse>>(`${this.apiUrl}/folders/${encodeURIComponent(folderId)}/documents`);
  }
}
