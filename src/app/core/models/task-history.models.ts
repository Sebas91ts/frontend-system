import { UploadedFileMetadata } from './form.models';

export interface TaskExecutionLog {
  id: string;
  processInstanceId: string;
  processDefinitionId: string;
  processKey?: string | null;
  processVersion?: number | null;
  taskDefinitionKey?: string | null;
  taskName?: string | null;
  areaId?: string | null;
  areaNombre?: string | null;
  assignedTo?: string | null;
  completedBy?: string | null;
  formData?: Record<string, unknown> | null;
  createdAt?: string | null;
  completedAt?: string | null;
}

export interface HistoryDisplayField {
  key: string;
  label: string;
  value: string;
  isFile: boolean;
  file?: UploadedFileMetadata;
}
