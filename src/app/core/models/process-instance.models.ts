export interface ProcessInstance {
  id: string;
  processDefinitionId?: string | null;
  processKey?: string | null;
  version?: number | null;
  nombreProceso?: string | null;
  estado?: string | null;
  currentElementId?: string | null;
  iniciadoPor?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}
