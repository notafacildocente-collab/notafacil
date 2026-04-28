import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsistenciaController } from './asistencia.controller';
import { AsistenciaService } from './asistencia.service';
import { Asistencia } from '../database/entities/asistencia.entity';
import { ProfesorAsignacion } from '../database/entities/profesor-asignacion.entity';
import { Estudiante } from '../database/entities/estudiante.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asistencia, ProfesorAsignacion, Estudiante]),
  ],
  controllers: [AsistenciaController],
  providers: [AsistenciaService],
  exports: [AsistenciaService],
})
export class AsistenciaModule {}
