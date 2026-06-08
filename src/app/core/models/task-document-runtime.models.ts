import { DocumentMetadata } from './document-lifecycle.models';

export type TaskDocumentRuntimeSummary = {
  total: number;
  completed: number;
  missingRequired: number;
  editable: number;
  pendingReview: number;
};

export type TaskDocumentRuntimeRequirement = {
  id: string;
  name: string;
  description?: string;
  documentDirection?: 'INPUT' | 'OUTPUT' | string;
  documentLifecyclePolicy?: string;
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
  status?: 'PENDING' | 'MISSING' | 'COMPLETED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | string;
  message?: string;
  canView?: boolean;
  canUpload?: boolean;
  canEdit?: boolean;
  canDownload?: boolean;
  canApprove?: boolean;
  canReject?: boolean;
  canLock?: boolean;
  documents?: DocumentMetadata[];
};

export type TaskDocumentRuntime = {
  processKey?: string;
  processVersion?: number;
  processInstanceId?: string;
  taskDefinitionKey?: string;
  taskInstanceId?: string;
  requirements: TaskDocumentRuntimeRequirement[];
  summary: TaskDocumentRuntimeSummary;
};
