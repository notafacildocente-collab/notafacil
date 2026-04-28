import {
  Injectable, ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asistencia, EstadoAsistencia } from '../database/entities/asistencia.entity';
import { ProfesorAsignacion } from '../database/entities/profesor-asignacion.entity';
import { Estudiante } from '../database/entities/estudiante.entity';

export interface RegistroAsistenciaDto {
  estudianteId: string;
  estado: EstadoAsistencia;
  observacion?: string;
}

@Injectable()
export class AsistenciaService {
  constructor(
    @InjectRepository(Asistencia)
    private asistenciaRepository: Repository<Asistencia>,

    @InjectRepository(ProfesorAsignacion)
    private asignacionRepository: Repository<ProfesorAsignacion>,

    @InjectRepository(Estudiante)
    private estudianteRepository: Repository<Estudiante>,
  ) {}

  /**
   * Guarda la asistencia de toda la clase para una fecha.
   * Usa UPSERT: si ya existe el registro lo actualiza, si no lo crea.
   */
  async guardarAsistencia(
    asignacionId: string,
    fecha: string,
    registros: RegistroAsistenciaDto[],
    profesorId: string,
  ): Promise<{ guardados: number }> {
    // Validar que la asignación pertenece al profesor
    const asignacion = await this.asignacionRepository.findOne({
      where: { id: asignacionId, profesorId },
    });

    if (!asignacion) {
      throw new ForbiddenException('No tienes asignación activa para esta clase');
    }

    // Upsert cada registro
    for (const reg of registros) {
      await this.asistenciaRepository
        .createQueryBuilder()
        .insert()
        .into(Asistencia)
        .values({
          asignacionId,
          estudianteId: reg.estudianteId,
          profesorId,
          fecha,
          estado: reg.estado,
          observacion: reg.observacion || null,
        })
        .orUpdate(
          ['estado', 'observacion', 'updatedAt'],
          ['asignacionId', 'estudianteId', 'fecha'],
        )
        .execute();
    }

    return { guardados: registros.length };
  }

  /**
   * Obtiene la asistencia de una clase en una fecha específica.
   */
  async obtenerAsistencia(
    asignacionId: string,
    fecha: string,
    profesorId: string,
  ): Promise<Asistencia[]> {
    // Validar acceso
    const asignacion = await this.asignacionRepository.findOne({
      where: { id: asignacionId, profesorId },
    });

    if (!asignacion) {
      throw new ForbiddenException('No tienes acceso a esta asignación');
    }

    return await this.asistenciaRepository.find({
      where: { asignacionId, fecha },
      order: { estudianteId: 'ASC' },
    });
  }

  /**
   * Resumen de asistencia de un estudiante en una asignación.
   * Retorna total de días y conteo por estado.
   */
  async resumenEstudiante(
    estudianteId: string,
    asignacionId: string,
    profesorId: string,
  ): Promise<any> {
    const asignacion = await this.asignacionRepository.findOne({
      where: { id: asignacionId, profesorId },
    });

    if (!asignacion) {
      throw new ForbiddenException('No tienes acceso a esta asignación');
    }

    const registros = await this.asistenciaRepository.find({
      where: { estudianteId, asignacionId },
      order: { fecha: 'DESC' },
    });

    const resumen = {
      total: registros.length,
      PRESENTE: 0,
      AUSENTE: 0,
      JUSTIFICADA: 0,
      INJUSTIFICADA: 0,
      porcentajeAsistencia: 0,
      registros,
    };

    registros.forEach((r) => {
      resumen[r.estado]++;
    });

    if (resumen.total > 0) {
      resumen.porcentajeAsistencia = Math.round(
        (resumen.PRESENTE / resumen.total) * 100,
      );
    }

    return resumen;
  }

  /**
   * Resumen de asistencia de TODOS los estudiantes de una clase.
   * Útil para que el profesor vea de un vistazo quién falta más.
   */
  async resumenClase(
    asignacionId: string,
    profesorId: string,
  ): Promise<any[]> {
    const asignacion = await this.asignacionRepository.findOne({
      where: { id: asignacionId, profesorId },
    });

    if (!asignacion) {
      throw new ForbiddenException('No tienes acceso a esta asignación');
    }

    // Traer estudiantes del curso
    const estudiantes = await this.estudianteRepository.find({
      where: { cursoId: asignacion.cursoId, activo: true },
      order: { apellido: 'ASC', nombre: 'ASC' },
    });

    const resultado = await Promise.all(
      estudiantes.map(async (est) => {
        const registros = await this.asistenciaRepository.find({
          where: { estudianteId: est.id, asignacionId },
        });

        const conteo = { PRESENTE: 0, AUSENTE: 0, JUSTIFICADA: 0, INJUSTIFICADA: 0 };
        registros.forEach((r) => conteo[r.estado]++);

        const total = registros.length;
        const porcentaje = total > 0
          ? Math.round((conteo.PRESENTE / total) * 100)
          : 100;

        return {
          estudianteId: est.id,
          nombre: `${est.nombre} ${est.apellido}`,
          numeroDocumento: est.numeroDocumento,
          total,
          ...conteo,
          porcentajeAsistencia: porcentaje,
        };
      }),
    );

    return resultado;
  }
}
