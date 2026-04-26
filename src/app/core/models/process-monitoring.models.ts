export interface ProcessActivityStat {
  taskDefinitionKey: string;
  taskName?: string | null;
  activeInstances: number;
}

export interface ProcessMonitorInstance {
  processInstanceId: string;
  businessKey?: string | null;
  startedAt?: string | null;
  currentTaskNames: string[];
  currentAreas: string[];
  assignedUsers: string[];
  activeTaskCount: number;
}

export interface ProcessMonitoring {
  processId: string;
  processKey?: string | null;
  processVersion?: number | null;
  nombreProceso?: string | null;
  estado?: string | null;
  xmlBpmn?: string | null;
  totalActiveInstances: number;
  activityStats: ProcessActivityStat[];
  instances: ProcessMonitorInstance[];
}
