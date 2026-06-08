import { DocumentAreaAccessRule } from './document-lifecycle.models';

export type TaskDocumentPermissions = {
  canView?: boolean;
  canUpload?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
  canDownload?: boolean;
  canReject?: boolean;
  canLock?: boolean;
};

export type DocumentLifecyclePolicy =
  | 'TASK_ONLY'
  | 'AVAILABLE_FOR_NEXT_TASKS'
  | 'AVAILABLE_FOR_INSTANCE'
  | 'PUBLISH_ON_PROCESS_END'
  | string;

export type DocumentDirection = 'INPUT' | 'OUTPUT' | string;

export type DocumentRequirement = {
  id?: string;
  name?: string;
  description?: string;
  documentDirection?: DocumentDirection;
  required?: boolean;
  allowUpload?: boolean;
  allowMultipleFiles?: boolean;
  editable?: boolean;
  collaborativeEditing?: boolean;
  requireApproval?: boolean;
  readOnlyAfterComplete?: boolean;
  allowedMimeTypes?: string[];
  maxFileSizeBytes?: number;
  maxFiles?: number;
  ownerAreaId?: string;
  allowedAreaIds?: string[];
  accessRules?: DocumentAreaAccessRule[];
  documentLifecyclePolicy?: DocumentLifecyclePolicy;
};

export type TaskDocumentConfig = {
  id: string;
  tenantId: string;
  processKey: string;
  processVersion: number;
  taskDefinitionKey: string;
  documentRequirements?: DocumentRequirement[];
  documentName?: string;
  description?: string;
  documentDirection?: 'INPUT' | 'OUTPUT' | string;
  required?: boolean;
  allowMultipleFiles?: boolean;
  allowUpload?: boolean;
  editable?: boolean;
  collaborativeEditing?: boolean;
  allowVersioning?: boolean;
  allowedMimeTypes?: string[];
  maxFileSizeBytes?: number;
  maxFiles?: number;
  readOnlyAfterComplete?: boolean;
  allowEditing?: boolean;
  requireApproval?: boolean;
  templateDocumentId?: string;
  permissions?: TaskDocumentPermissions;
  ownerAreaId?: string;
  allowedAreaIds?: string[];
  accessRules?: DocumentAreaAccessRule[];
  shareWithNextArea?: boolean;
  autoGenerateOnTaskStart?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
};

export type TaskDocumentConfigCreateRequest = {
  processKey: string;
  processVersion: number;
  taskDefinitionKey: string;
  documentRequirements?: DocumentRequirement[];
  documentName?: string;
  description?: string;
  documentDirection?: 'INPUT' | 'OUTPUT' | string;
  required?: boolean;
  allowMultipleFiles?: boolean;
  allowUpload?: boolean;
  editable?: boolean;
  collaborativeEditing?: boolean;
  allowVersioning?: boolean;
  allowedMimeTypes?: string[];
  maxFileSizeBytes?: number;
  maxFiles?: number;
  readOnlyAfterComplete?: boolean;
  allowEditing?: boolean;
  requireApproval?: boolean;
  templateDocumentId?: string;
  permissions?: TaskDocumentPermissions;
  ownerAreaId?: string;
  allowedAreaIds?: string[];
  accessRules?: DocumentAreaAccessRule[];
  shareWithNextArea?: boolean;
  autoGenerateOnTaskStart?: boolean;
};

export type TaskDocumentUploadValidationRequest = {
  processKey: string;
  processVersion: number;
  taskDefinitionKey: string;
  processInstanceId: string;
  documentRequirementId?: string;
  mimeType?: string;
  size?: number;
};

export type TaskDocumentUploadValidationResponse = {
  allowed: boolean;
  reason?: string;
};
