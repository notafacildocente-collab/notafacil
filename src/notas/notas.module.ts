import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import {
  Nota,
  Recuperacion,
  Desempeno,
  ProfesorAsignacion,
  Estudiante,
  Periodo,
  Auditoria,
  Asistencia,
} from '../database/entities';

// Services
import { NotasService } from './notas.service';

// Controllers
import { NotasController } from './notas.controller';

// Imports (usar guards y auth)
import { AuthModule } from '../auth/auth.module';

/**
 * NOTAS MODULE
 * 
 * Encapsula lógica de gestión de calificaciones
 * 
 * Responsabilidades:
 * - CRUD de notas
 * - Cálculo de promedios (automático)
 * - Recuperaciones
 * - Validación de períodos cerrados
 * - Sincronización offline
 * - Auditoría
 * 
 * Usa:
 * - JwtAuthGuard: Autenticación
 * - RolesGuard: Validación de roles
 * - CustomValidators: Validación de negocio
 * 
 * Exporta: NotasService (para otros módulos)
 */
@Module({
  imports: [
    // 📦 TypeORM: Entities para este módulo
    TypeOrmModule.forFeature([
      Nota,
      Recuperacion,
      Desempeno,
      ProfesorAsignacion,
      Estudiante,
      Periodo,
      Auditoria,
      Asistencia,
    ]),

    // 🔐 Auth: Guards y decorators
    AuthModule,
  ],

  providers: [NotasService],

  controllers: [NotasController],

  exports: [NotasService],
})
export class NotasModule {}
