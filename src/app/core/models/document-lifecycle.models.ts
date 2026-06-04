export type DocumentLifecycleState =
  | 'PENDING'
  | 'UPLOADED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'FINAL'
  | 'ARCHIVED';

import { Tag } from './tag.models';

export type DocumentMetadata = {
  id: string;
  tenantId: string;
  processInstanceId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  uploadedBy: string;
  uploadedAt?: string;
  version?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  lastAccessedAt?: string;
  updatedBy?: string;
  processKey?: string;
  processVersion?: number;
  taskDefinitionKey?: string;
  taskInstanceId?: string;
  documentState?: DocumentLifecycleState;
  locked?: boolean;
  lockedBy?: string;
  lockedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  comments?: string[];
  folderId?: string;
  tagIds?: string[];
  tags?: Tag[];
  editable?: boolean;
  collaborativeEditing?: boolean;
  onlyOfficeDocumentKey?: string;
  templateDocumentId?: string;
  currentEditor?: string;
  editingStartedAt?: string;
};

export type DocumentLifecycleActionRequest = {
  comment?: string;
};
