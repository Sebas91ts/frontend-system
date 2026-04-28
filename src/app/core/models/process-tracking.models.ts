import { TaskExecutionLog } from './task-history.models';

export interface ActiveProcessTask {
  id: string;
  taskDefinitionKey?: string | null;
  taskName?: string | null;
  areaId?: string | null;
  areaNombre?: string | null;
  assignedTo?: string | null;
  createdAt?: string | null;
}

export interface ProcessInstanceTracking {
  processInstanceId: string;
  processDefinitionId?: string | null;
  processKey?: string | null;
  processVersion?: number | null;
  nombreProceso?: string | null;
  estado?: string | null;
  currentTaskName?: string | null;
  currentAreaNombre?: string | null;
  currentAssignedTo?: string | null;
  activeTasks: ActiveProcessTask[];
  history: TaskExecutionLog[];
  xmlBpmn?: string | null;
  completedTaskKeys: string[];
  activeTaskKeys: string[];
  pendingTaskKeys: string[];
}

export interface ClientTrackingHistoryItem {
  taskName?: string | null;
  areaName?: string | null;
  completedAt?: string | null;
  formData?: Record<string, unknown> | null;
}

export interface ClientInstanceTracking {
  processName?: string | null;
  estado?: string | null;
  startedAt?: string | null;
  progressPercentage?: number | null;
  currentTaskName?: string | null;
  currentAreaName?: string | null;
  history: ClientTrackingHistoryItem[];
  xmlBpmn?: string | null;
  completedTaskKeys: string[];
  activeTaskKeys: string[];
  pendingTaskKeys: string[];
}
