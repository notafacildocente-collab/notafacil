import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstudianteController } from './estudiante.controller';
import { EstudianteService } from './estudiante.service';
import { Usuario } from '../database/entities/usuario.entity';
import { Nota } from '../database/entities/nota.entity';
import { Desempeno } from '../database/entities/desempeno.entity';
import { Periodo } from '../database/entities/periodo.entity';
import { Asistencia } from '../database/entities/asistencia.entity';
import { ProfesorAsignacion } from '../database/entities/profesor-asignacion.entity';
import { Materia } from '../database/entities/materia.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Nota,
      Desempeno,
      Periodo,
      Asistencia,
      ProfesorAsignacion,
      Materia,
    ]),
  ],
  controllers: [EstudianteController],
  providers: [EstudianteService],
})
export class EstudianteModule {}