import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Periodo } from '../database/entities/periodo.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { ProfesorAsignacion } from '../database/entities/profesor-asignacion.entity';
import { Materia } from '../database/entities/materia.entity';
import { Curso } from '../database/entities/curso.entity';
import { Asistencia } from '../database/entities/asistencia.entity';

@Injectable()
export class RectorService {
  constructor(
    @InjectRepository(Periodo)
    private periodosRepository: Repository<Periodo>,
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
    @InjectRepository(ProfesorAsignacion)
    private asignacionesRepository: Repository<ProfesorAsignacion>,
    @InjectRepository(Materia)
    private materiasRepository: Repository<Materia>,
    @InjectRepository(Curso)
    private cursosRepository: Repository<Curso>,
    @InjectRepository(Asistencia)
    private asistenciaRepository: Repository<Asistencia>,
  ) {}

  // ── Períodos ──────────────────────────────────────────────────────────────

  async getPeriodos(): Promise<Periodo[]> {
    return await this.periodosRepository.find({
      order: { numero: 'ASC' },
    });
  }

  async abrirPeriodo(periodoId: string): Promise<Periodo> {
    // Solo un período abierto a la vez
    const periodoAbierto = await this.periodosRepository.findOne({
      where: { cerrado: false },
    });

    if (periodoAbierto && periodoAbierto.id !== periodoId) {
      throw new BadRequestException(
        `Ya hay un período abierto: Período ${periodoAbierto.numero}. Ciérrelo primero.`,
      );
    }

    const periodo = await this.periodosRepository.findOne({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException('Período no encontrado');

    periodo.cerrado = false;
    return await this.periodosRepository.save(periodo);
  }

  async cerrarPeriodo(periodoId: string): Promise<Periodo> {
    const periodo = await this.periodosRepository.findOne({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException('Período no encontrado');

    periodo.cerrado = true;
    return await this.periodosRepository.save(periodo);
  }

  // ── Profesores ────────────────────────────────────────────────────────────

  async getProfesores(): Promise<any[]> {
    const profesores = await this.usuariosRepository
      .createQueryBuilder('u')
      .innerJoin('u.rol', 'r')
      .where('r.nombre = :rol', { rol: 'PROFESOR' })
      .andWhere('u.activo = true')
      .select(['u.id', 'u.nombre', 'u.email'])
      .getMany();

    return profesores;
  }

  async getAsignacionesProfesor(profesorId: string): Promise<any[]> {
    const asignaciones = await this.asignacionesRepository.find({
      where: { profesorId, activa: true },
      relations: ['materia', 'curso', 'periodo'],
    });

    // Agrupar por materia+curso, mostrar solo una fila por combinación
    const grupos = new Map();
    asignaciones.forEach(a => {
      const key = `${a.materia.id}-${a.curso.id}`;
      if (!grupos.has(key)) {
        grupos.set(key, {
          id: a.id,
          materia: a.materia.nombre,
          curso: a.curso.nombre,
          periodo: a.periodo.numero,
          activa: a.activa,
        });
      }
    });

    return Array.from(grupos.values());
  }

  async asignarMateria(
    profesorId: string,
    materiaId: string,
    cursoId: string,
    periodoId: string,
  ): Promise<ProfesorAsignacion> {
    const existente = await this.asignacionesRepository.findOne({
      where: { profesorId, materiaId, cursoId, periodoId },
    });

    if (existente) {
      existente.activa = true;
      return await this.asignacionesRepository.save(existente);
    }

    const nueva = this.asignacionesRepository.create({
      profesorId,
      materiaId,
      cursoId,
      periodoId,
      activa: true,
    });

    return await this.asignacionesRepository.save(nueva);
  }

  async desactivarAsignacion(asignacionId: string): Promise<ProfesorAsignacion> {
    const asignacion = await this.asignacionesRepository.findOne({
      where: { id: asignacionId },
    });
    if (!asignacion) throw new NotFoundException('Asignación no encontrada');

    asignacion.activa = false;
    return await this.asignacionesRepository.save(asignacion);
  }

  // ── Reportes ──────────────────────────────────────────────────────────────

  async getResumenGeneral(): Promise<any> {
    const totalProfesores = await this.usuariosRepository
      .createQueryBuilder('u')
      .innerJoin('u.rol', 'r')
      .where('r.nombre = :rol', { rol: 'PROFESOR' })
      .andWhere('u.activo = true')
      .getCount();

    const totalCursos = await this.cursosRepository.count();
    const periodos = await this.periodosRepository.find({ order: { numero: 'ASC' } });
    const periodoActivo = periodos.find(p => !p.cerrado);

    return {
      totalProfesores,
      totalCursos,
      periodoActivo: periodoActivo ? `Período ${periodoActivo.numero}` : 'Ninguno',
      periodos,
    };
  }

  async getResumenAsistencia(cursoId: string): Promise<any[]> {
    const query = `
      SELECT 
        e.nombre || ' ' || e.apellido as estudiante,
        COUNT(a.id) as total,
        SUM(CASE WHEN a.estado = 'AUSENTE' THEN 1 ELSE 0 END) as ausencias,
        SUM(CASE WHEN a.estado = 'TARDE' THEN 1 ELSE 0 END) as tardanzas,
        SUM(CASE WHEN a.estado = 'PRESENTE' THEN 1 ELSE 0 END) as presencias
      FROM estudiantes e
      LEFT JOIN asistencia a ON a."estudianteId" = e.id
      WHERE e."cursoId" = $1
      GROUP BY e.id, e.nombre, e.apellido
      ORDER BY e.apellido, e.nombre
    `;
    return await this.asignacionesRepository.query(query, [cursoId]);
  }

  // ── Catálogos ─────────────────────────────────────────────────────────────

  async getMaterias(): Promise<Materia[]> {
    return await this.materiasRepository.find({ order: { nombre: 'ASC' } });
  }

  async getCursos(): Promise<Curso[]> {
    return await this.cursosRepository.find({ order: { nombre: 'ASC' } });
  }
}