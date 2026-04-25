export interface DashboardMetricItem {
  label: string;
  total: number;
}

export interface DashboardRecentTask {
  processInstanceId: string;
  processKey?: string | null;
  processVersion?: number | null;
  taskName: string;
  areaNombre: string;
  assignedTo?: string | null;
  completedBy?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
}

export interface DashboardSummary {
  totalProcesosPublicados: number;
  totalInstanciasActivas: number;
  totalTareasPendientes: number;
  totalTareasCompletadas: number;
  tareasCompletadasPorArea: DashboardMetricItem[];
  tareasCompletadasPorUsuario: DashboardMetricItem[];
  ultimosLogsTareas: DashboardRecentTask[];
}
