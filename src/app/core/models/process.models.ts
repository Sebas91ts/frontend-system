export interface Proceso {
  id: string;
  nombre: string;
  xml: string;
  version: number;
  estado: 'BORRADOR' | 'PUBLICADO' | 'HISTORICO' | string;
  processKey: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProcesoCreateRequest {
  nombre: string;
  xml: string;
}

export interface ProcesoUpdateRequest {
  nombre: string;
  xml: string;
}
