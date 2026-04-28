import { FormDefinition } from './form.models';

export interface ClientTaskListItem {
  taskId: string;
  taskName: string;
  processInstanceId: string;
  processKey: string;
  processVersion: number;
  processName: string;
  areaName?: string | null;
  assignee?: string | null;
  assignedToClient: boolean;
  formDefinition?: FormDefinition | null;
}

export interface ClientTaskFormResponse {
  taskId: string;
  taskName: string;
  processInstanceId: string;
  processKey: string;
  processVersion: number;
  processName: string;
  areaName?: string | null;
  assignee?: string | null;
  formDefinition?: FormDefinition | null;
  currentValues: Record<string, unknown>;
}

export interface ClientTaskCompleteResponse {
  taskId: string;
  processInstanceId: string;
  processName: string;
  completedBy: string;
  completedAt: string;
  message: string;
}
