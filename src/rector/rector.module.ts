import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RectorController } from './rector.controller';
import { RectorService } from './rector.service';
import { Periodo } from '../database/entities/periodo.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { ProfesorAsignacion } from '../database/entities/profesor-asignacion.entity';
import { Materia } from '../database/entities/materia.entity';
import { Curso } from '../database/entities/curso.entity';
import { Asistencia } from '../database/entities/asistencia.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Periodo,
      Usuario,
      ProfesorAsignacion,
      Materia,
      Curso,
      Asistencia,
    ]),
  ],
  controllers: [RectorController],
  providers: [RectorService],
})
export class RectorModule {}