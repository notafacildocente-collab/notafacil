import { IsUUID, IsNumber, IsString, IsOptional, IsDecimal, Min, Max, IsBoolean } from 'class-validator';

export class CreateNotaDto {
  @IsUUID()
  asignacionId: string;

  @IsUUID()
  desempenoId: string;

  @IsUUID()
  estudianteId: string;

  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  valor: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsBoolean()
  creadoOffline?: boolean;
}

export class UpdateNotaDto {
  @IsOptional()
  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  valor?: number;

  @IsOptional()
  @IsString()
  descripcion?: string;
}

export class CrearRecuperacionDto {
  @IsUUID()
  desempenoId: string;

  @IsUUID()
  estudianteId: string;

  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  valor: number;

  @IsString()
  @Min(10)
  justificacion: string;
}

export class ObtenerPromediosDto {
  @IsUUID()
  estudianteId: string;

  @IsUUID()
  periodoId: string;
}

// DTO para exportación
export class ExportarPeriodoDto {
  @IsUUID()
  periodoId: string;

  @IsUUID()
  cursoId: string;

  @IsString()
  formato: 'excel' | 'pdf'; // 'excel' o 'pdf'
}
