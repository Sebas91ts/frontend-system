export interface Proceso {
  id: string;
  nombre: string;
  descripcion?: string | null;
  xml: string;
  version: number;
  estado: 'BORRADOR' | 'PUBLICADO' | 'HISTORICO' | string;
  processKey: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
  lastSavedAt?: string;
  lastSavedBy?: string;
}

export interface ProcesoCreateRequest {
  nombre: string;
  descripcion?: string | null;
  xml: string;
  clientStartEnabled?: boolean | null;
}

export interface ProcesoUpdateRequest {
  nombre: string;
  descripcion?: string | null;
  xml: string;
  clientStartEnabled?: boolean | null;
  lastSavedBy?: string;
}

export interface ProcesoAutosaveRequest {
  nombre?: string;
  descripcion?: string | null;
  xml: string;
  clientStartEnabled?: boolean | null;
  lastSavedBy?: string;
}

export interface ClientProcessListItem {
  processId: string;
  processKey: string;
  nombre: string;
  version: number;
  descripcion?: string | null;
}

export interface ClientProcessStartPreview {
  processId: string;
  processKey: string;
  processVersion: number;
  processName: string;
  firstTaskDefinitionKey?: string | null;
  firstTaskName?: string | null;
  firstTaskAreaId?: string | null;
  firstTaskAreaName?: string | null;
  formDefinition?: import('./form.models').FormDefinition | null;
}

export interface ClientProcessStartRequest {
  variables?: Record<string, unknown>;
}

export interface ClientProcessStartResult {
  id: string;
  clientUserId: string;
  clientEmail: string;
  processId: string;
  processKey: string;
  processVersion: number;
  processName: string;
  processInstanceId: string;
  estado: string;
  startedAt: string;
  finishedAt?: string | null;
}

export interface ClientProcessInstanceItem {
  id: string;
  processName: string;
  processKey: string;
  processVersion: number;
  processInstanceId: string;
  estado: string;
  startedAt: string;
  finishedAt?: string | null;
}
