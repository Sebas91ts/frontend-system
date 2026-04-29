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
  tareasPendientesPorArea: DashboardMetricItem[];
  tareasCompletadasPorArea: DashboardMetricItem[];
  tareasCompletadasPorUsuario: DashboardMetricItem[];
  actividadConMasPendientes: string;
  actividadConMasPendientesTotal: number;
  tareaConMayorTiempoPromedioEspera: string;
  tareaConMayorTiempoPromedioEsperaMinutos: number;
  areaConMasAcumulacion: string;
  areaConMasAcumulacionTotal: number;
  ultimosLogsTareas: DashboardRecentTask[];
}
