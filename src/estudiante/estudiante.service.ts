import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../database/entities/usuario.entity';
import { Nota } from '../database/entities/nota.entity';
import { Desempeno } from '../database/entities/desempeno.entity';
import { Periodo } from '../database/entities/periodo.entity';
import { Asistencia } from '../database/entities/asistencia.entity';
import { ProfesorAsignacion } from '../database/entities/profesor-asignacion.entity';
import { Materia } from '../database/entities/materia.entity';

@Injectable()
export class EstudianteService {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
    @InjectRepository(Nota)
    private notasRepository: Repository<Nota>,
    @InjectRepository(Desempeno)
    private desempenosRepository: Repository<Desempeno>,
    @InjectRepository(Periodo)
    private periodosRepository: Repository<Periodo>,
    @InjectRepository(Asistencia)
    private asistenciaRepository: Repository<Asistencia>,
    @InjectRepository(ProfesorAsignacion)
    private asignacionesRepository: Repository<ProfesorAsignacion>,
    @InjectRepository(Materia)
    private materiasRepository: Repository<Materia>,
  ) {}

  private async getEstudianteId(usuarioId: string): Promise<string> {
    const usuario = await this.usuariosRepository.findOne({
      where: { id: usuarioId },
    });
    if (!usuario || !usuario['estudianteId']) {
      throw new NotFoundException('No se encontró el perfil de estudiante');
    }
    return usuario['estudianteId'];
  }

  async getNotas(usuarioId: string, periodoId?: string): Promise<any[]> {
    const estudianteId = await this.getEstudianteId(usuarioId);

    let periodo: Periodo;
    if (periodoId) {
      periodo = await this.periodosRepository.findOne({ where: { id: periodoId } });
    } else {
      periodo = await this.periodosRepository.findOne({ where: { cerrado: false } });
    }

    if (!periodo) throw new NotFoundException('No hay período activo');

    const desempenos = await this.desempenosRepository.find({
      where: { periodoId: periodo.id },
      order: { orden: 'ASC' },
    });

    const asignaciones = await this.asignacionesRepository
      .createQueryBuilder('pa')
      .innerJoinAndSelect('pa.materia', 'materia')
      .innerJoin('cursos', 'curso', 'curso.id = pa."cursoId"')
      .innerJoin('estudiantes', 'est', 'est."cursoId" = curso.id')
      .where('est.id = :estudianteId', { estudianteId })
      .andWhere('pa."periodoId" = :periodoId', { periodoId: periodo.id })
      .andWhere('pa.activa = true')
      .getMany();

    // Agrupar por materia para evitar duplicados
    const materiasUnicas = new Map();
    asignaciones.forEach(a => {
      if (!materiasUnicas.has(a.materia.id)) {
        materiasUnicas.set(a.materia.id, a);
      }
    });

    const resultado = await Promise.all(
      Array.from(materiasUnicas.values()).map(async (asignacion) => {
        const desempenosConNotas = await Promise.all(
          desempenos.map(async (d) => {
            const notas = await this.notasRepository.find({
              where: {
                estudianteId,
                desempenoId: d.id,
                asignacionId: asignacion.id,
              },
            });

            const promedio = notas.length > 0
              ? Math.round((notas.reduce((a, n) => a + Number(n.valor), 0) / notas.length) * 10) / 10
              : 0;

            return {
              nombre: d.nombre,
              porcentaje: Number(d.porcentaje),
              promedio,
              cantidadNotas: notas.length,
            };
          }),
        );

        const notaFinal = Math.round(
          desempenosConNotas.reduce((acc, d) => acc + (d.promedio * d.porcentaje) / 100, 0) * 10
        ) / 10;

        return {
          materiaId: asignacion.materia.id,
          materia: asignacion.materia.nombre,
          desempenos: desempenosConNotas,
          notaFinal,
        };
      }),
    );

    return resultado.sort((a, b) => a.materia.localeCompare(b.materia));
  }

  async getAsistencia(usuarioId: string): Promise<any[]> {
    const estudianteId = await this.getEstudianteId(usuarioId);

    const periodo = await this.periodosRepository.findOne({ where: { cerrado: false } });
    if (!periodo) throw new NotFoundException('No hay período activo');

    const asignaciones = await this.asignacionesRepository
      .createQueryBuilder('pa')
      .innerJoinAndSelect('pa.materia', 'materia')
      .innerJoin('cursos', 'curso', 'curso.id = pa."cursoId"')
      .innerJoin('estudiantes', 'est', 'est."cursoId" = curso.id')
      .where('est.id = :estudianteId', { estudianteId })
      .andWhere('pa."periodoId" = :periodoId', { periodoId: periodo.id })
      .andWhere('pa.activa = true')
      .getMany();

    // Agrupar por materia
    const materiasUnicas = new Map();
    asignaciones.forEach(a => {
      if (!materiasUnicas.has(a.materia.id)) {
        materiasUnicas.set(a.materia.id, a);
      }
    });

    const resultado = await Promise.all(
      Array.from(materiasUnicas.values()).map(async (asignacion) => {
        const registros = await this.asistenciaRepository.find({
          where: { estudianteId, asignacionId: asignacion.id },
        });

        const conteo = { PRESENTE: 0, AUSENTE: 0, TARDE: 0, EXCUSADO: 0 };
        registros.forEach(r => conteo[r.estado]++);

        const total = registros.length;
        const porcentaje = total > 0
          ? Math.round(((conteo.PRESENTE + conteo.TARDE) / total) * 100)
          : 100;

        return {
          materia: asignacion.materia.nombre,
          total,
          ...conteo,
          porcentaje,
        };
      }),
    );

    return resultado.sort((a, b) => a.materia.localeCompare(b.materia));
  }

  async getHorario(usuarioId: string, dia?: number): Promise<any[]> {
    const estudianteId = await this.getEstudianteId(usuarioId);

    const query = `
      SELECT 
        h."diaSemana",
        h."horaInicio",
        h."horaFin",
        m.nombre as materia,
        u.nombre as profesor
      FROM horarios h
      JOIN profesor_asignaciones pa ON pa.id = h."asignacionId"
      JOIN materias m ON m.id = pa."materiaId"
      JOIN usuarios u ON u.id = pa."profesorId"
      JOIN estudiantes est ON est."cursoId" = pa."cursoId"
      WHERE est.id = $1
      ${dia ? 'AND h."diaSemana" = $2' : ''}
      ORDER BY h."diaSemana", h."horaInicio"
    `;

    const params = dia ? [estudianteId, dia] : [estudianteId];
    return await this.notasRepository.query(query, params);
  }

  async getBoletin(usuarioId: string, periodoId: string): Promise<any> {
    const estudianteId = await this.getEstudianteId(usuarioId);

    const periodo = await this.periodosRepository.findOne({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException('Período no encontrado');
    if (!periodo.cerrado) throw new ForbiddenException('El boletín solo está disponible cuando el período está cerrado');

    const notas = await this.getNotas(usuarioId, periodoId);

    const promedio = notas.length > 0
      ? Math.round((notas.reduce((a, n) => a + n.notaFinal, 0) / notas.length) * 10) / 10
      : 0;

    return {
      periodo: periodo.numero,
      materias: notas,
      promedioGeneral: promedio,
      aprobado: promedio >= 3.0,
    };
  }

  async getPeriodos(usuarioId: string): Promise<Periodo[]> {
    return await this.periodosRepository.find({ order: { numero: 'ASC' } });
  }

  async getPerfil(usuarioId: string): Promise<any> {
    const estudianteId = await this.getEstudianteId(usuarioId);
    const resultado = await this.notasRepository.query(`
      SELECT e.nombre, e.apellido, e."numeroDocumento", c.nombre as curso
      FROM estudiantes e
      JOIN cursos c ON c.id = e."cursoId"
      WHERE e.id = $1
    `, [estudianteId]);

    if (resultado.length === 0) throw new NotFoundException('Estudiante no encontrado');
    return resultado[0];
  }
}