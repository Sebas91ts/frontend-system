export interface Area {
  id: string;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AreaCreateRequest {
  nombre: string;
  descripcion?: string;
}

export interface AreaUpdateRequest {
  nombre: string;
  descripcion?: string;
  activa?: boolean;
}
