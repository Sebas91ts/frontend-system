export interface TareaInstancia {
  id: string;
  name?: string | null;
  assignee?: string | null;
  created?: string | null;
  processDefinitionId?: string | null;
  processInstanceId?: string | null;
  taskDefinitionKey?: string | null;
  // Compatibilidad con la vista previa anterior
  nombreProceso?: string | null;
  nombreTarea?: string | null;
  areaId?: string | null;
  areaNombre?: string | null;
  estado?: string;
  assignedTo?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
}
