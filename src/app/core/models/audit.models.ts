export type AuditAction =
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_METADATA_VIEWED'
  | 'DOCUMENT_DOWNLOAD_REQUESTED'
  | 'DOCUMENT_TAG_ADDED'
  | 'DOCUMENT_TAG_REMOVED'
  | 'DOCUMENT_EDITING_STARTED'
  | 'DOCUMENT_EDITING_FINISHED'
  | 'DOCUMENT_SAVED_FROM_ONLYOFFICE'
  | 'DOCUMENT_APPROVED'
  | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_LOCKED'
  | 'DOCUMENT_UNLOCKED'
  | 'DOCUMENT_WORKFLOW_UPDATED'
  | 'TASK_CLAIMED'
  | 'TASK_COMPLETED'
  | 'FORM_SUBMITTED';

export type AuditEntityType = 'DOCUMENT' | 'TASK' | 'FORM' | 'PROCESS_INSTANCE';

export interface AuditEvent {
  id: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  entityName?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  actorRoles?: string[];
  tenantId?: string | null;
  areaId?: string | null;
  areaName?: string | null;
  processKey?: string | null;
  processVersion?: number | null;
  processInstanceId?: string | null;
  taskDefinitionKey?: string | null;
  taskInstanceId?: string | null;
  taskName?: string | null;
  documentId?: string | null;
  documentName?: string | null;
  documentVersion?: number | null;
  documentState?: string | null;
  documentRequirementId?: string | null;
  documentRequirementName?: string | null;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditSearchRequest {
  action?: AuditAction;
  entityType?: AuditEntityType;
  entityId?: string;
  actorEmail?: string;
  areaId?: string;
  processInstanceId?: string;
  processKey?: string;
  taskInstanceId?: string;
  taskDefinitionKey?: string;
  documentId?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  page?: number;
  size?: number;
}

export interface AuditSearchResponse {
  content: AuditEvent[];
  totalElements: number;
  page: number;
  size: number;
  totalPages: number;
}
