export interface Proceso {
  id: string;
  nombre: string;
  xml: string;
  version: number;
  createdAt: string;
}

export interface ProcesoCreateRequest {
  nombre: string;
  xml: string;
}
