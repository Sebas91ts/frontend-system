export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  roles: string[];
  activo: boolean;
  areaId?: string | null;
  areaNombre?: string | null;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  usuario: Usuario;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  areaId?: string;
  roles?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
