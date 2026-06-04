import { DocumentLifecycleState, DocumentMetadata } from './document-lifecycle.models';

export type DocumentSearchRequest = {
  tenantId?: string;
  folderId?: string;
  tagId?: string;
  documentState?: DocumentLifecycleState;
  mimeType?: string;
  uploadedBy?: string;
  processInstanceId?: string;
  processKey?: string;
  processVersion?: number;
  taskDefinitionKey?: string;
  originalName?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  uploadedAtFrom?: string;
  uploadedAtTo?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
};

export type DocumentSearchResponse = {
  content: DocumentMetadata[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sortBy: string;
  sortDirection: 'ASC' | 'DESC';
};
