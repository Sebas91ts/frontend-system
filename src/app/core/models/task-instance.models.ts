export interface TareaInstancia {
  id: string;
  processInstanceId: string;
  processDefinitionId: string;
  nombreProceso?: string | null;
  taskDefinitionKey: string;
  nombreTarea: string;
  areaId?: string | null;
  areaNombre?: string | null;
  estado: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA' | string;
  assignedTo?: string | null;
  createdAt: string;
  completedAt?: string | null;
}
