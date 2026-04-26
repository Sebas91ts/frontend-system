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
