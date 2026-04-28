import { IsEmail, IsString, MinLength, IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  nombre: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}

export class AceptarPoliticaDto {
  @IsBoolean()
  aceptacion: boolean;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class LoginResponseDto {
  @IsString()
  accessToken: string;

  @IsString()
  refreshToken: string;

  @IsString()
  @IsUUID()
  usuarioId: string;

  @IsString()
  rol: string;

  @IsString()
  nombre: string;
}
