export type TaskDocumentPermissions = {
  canView?: boolean;
  canUpload?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
};

export type TaskDocumentConfig = {
  id: string;
  tenantId: string;
  processKey: string;
  processVersion: number;
  taskDefinitionKey: string;
  required?: boolean;
  editable?: boolean;
  collaborativeEditing?: boolean;
  allowVersioning?: boolean;
  allowedMimeTypes?: string[];
  maxFileSizeBytes?: number;
  maxFiles?: number;
  readOnlyAfterComplete?: boolean;
  templateDocumentId?: string;
  permissions?: TaskDocumentPermissions;
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
  required?: boolean;
  editable?: boolean;
  collaborativeEditing?: boolean;
  allowVersioning?: boolean;
  allowedMimeTypes?: string[];
  maxFileSizeBytes?: number;
  maxFiles?: number;
  readOnlyAfterComplete?: boolean;
  templateDocumentId?: string;
  permissions?: TaskDocumentPermissions;
  autoGenerateOnTaskStart?: boolean;
};

export type TaskDocumentUploadValidationRequest = {
  processKey: string;
  processVersion: number;
  taskDefinitionKey: string;
  processInstanceId: string;
  mimeType?: string;
  size?: number;
};

export type TaskDocumentUploadValidationResponse = {
  allowed: boolean;
  reason?: string;
};

