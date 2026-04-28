/**
 * Tipos de datos para NotaFácil Docente
 */

export interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  numeroDocumento: string;
  email?: string;
  telefono?: string;
  sedeId: string;
  cursoId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Desempeno {
  id: string;
  nombre: string;
  descripcion?: string;
  porcentaje: number;
  periodoId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Nota {
  id: string;
  estudianteId: string;
  desempenoId: string;
  valor: number;
  descripcion: string;
  profesorId: string;
  deviceId: string;
  creadoOffline: boolean;
  createdAt: Date;
  updatedAt?: Date;
  syncVersion: number;
}

export interface Periodo {
  id: string;
  nombre: string;
  fechaInicio: Date;
  fechaFin: Date;
  sedeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Materia {
  id: string;
  nombre: string;
  profesor: string;
  cursoId: string;
  sedeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: 'PROFESOR' | 'RECTOR' | 'COORDINADOR' | 'SECRETARIA';
  sedeId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  usuario: Usuario;
}

export interface SyncQueueItem {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entidad: string;
  payload: any;
  retries: number;
  createdAt: Date;
  lastError?: string;
}
