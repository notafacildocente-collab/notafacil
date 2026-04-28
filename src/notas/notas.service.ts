import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
import { CreateNotaDto, UpdateNotaDto, CrearRecuperacionDto } from './dto/nota.dto';

@Injectable()
export class NotasService {
  constructor(
    @InjectRepository(ProfesorAsignacion)
    private asignacionesRepository: Repository<ProfesorAsignacion>,
    @InjectRepository(Nota)
    private notasRepository: Repository<Nota>,
    @InjectRepository(Recuperacion)
    private recuperacionesRepository: Repository<Recuperacion>,
    @InjectRepository(Desempeno)
    private desempenosRepository: Repository<Desempeno>,
    @InjectRepository(ProfesorAsignacion)
    private profesorAsignacionRepository: Repository<ProfesorAsignacion>,
    @InjectRepository(Estudiante)
    private estudiantesRepository: Repository<Estudiante>,
    @InjectRepository(Periodo)
    private periodosRepository: Repository<Periodo>,
    @InjectRepository(Auditoria)
    private auditoriaRepository: Repository<Auditoria>,

    @InjectRepository(Asistencia)
    private asistenciaRepository: Repository<Asistencia>,
  ) {}

  async crearNota(dto: CreateNotaDto, profesorId: string, ipAddress: string, userAgent: string): Promise<Nota> {
    const asignacion = await this.profesorAsignacionRepository.findOne({
      where: { id: dto.asignacionId, profesorId },
      relations: ['periodo', 'materia', 'curso'],
    });
    if (!asignacion) throw new ForbiddenException('No tienes asignación a esta materia');
    if (!asignacion.activa) throw new ForbiddenException('Asignación inactiva');
    if (asignacion.periodo.cerrado) throw new ForbiddenException('Periodo cerrado');
    if (new Date() > asignacion.periodo.fechaCierre) throw new ForbiddenException('Fecha de cierre excedida');

    const estudiante = await this.estudiantesRepository.findOne({
      where: { id: dto.estudianteId, cursoId: asignacion.cursoId },
    });
    if (!estudiante) throw new NotFoundException('Estudiante no encontrado en este curso');

    const desempeno = await this.desempenosRepository.findOne({
      where: { id: dto.desempenoId, periodoId: asignacion.periodoId, materiaId: asignacion.materiaId },
    });
    if (!desempeno) throw new NotFoundException('Desempeño no encontrado');
    if (dto.valor < 1.0 || dto.valor > 5.0) throw new BadRequestException('Nota debe estar entre 1.0 y 5.0');

    const nota = this.notasRepository.create({
      asignacionId: dto.asignacionId,
      desempenoId: dto.desempenoId,
      estudianteId: dto.estudianteId,
      valor: dto.valor,
      descripcion: dto.descripcion,
      profesorId,
      deviceId: dto.deviceId || null,
      creadoOffline: dto.creadoOffline || false,
      ipAddress,
      syncVersion: 0,
    });

    // Determinar posición de esta nota (cuántas notas ya tiene para este desempeño)
    const notasExistentes = await this.notasRepository.find({
      where: { estudianteId: dto.estudianteId, desempenoId: dto.desempenoId, asignacionId: dto.asignacionId },
      order: { createdAt: 'ASC' },
    });
    const posicion = notasExistentes.length; // 0-indexed: si ya tiene 2, esta es la posición 2

    // Si no viene descripcion, intentar heredarla de otro estudiante en la misma posición
    let descripcionFinal = dto.descripcion || null;
    if (!descripcionFinal) {
      const otraNotaEnPosicion = await this.notasRepository
        .createQueryBuilder('n')
        .where('n.asignacionId = :asignacionId', { asignacionId: dto.asignacionId })
        .andWhere('n.desempenoId = :desempenoId', { desempenoId: dto.desempenoId })
        .andWhere('n.estudianteId != :estudianteId', { estudianteId: dto.estudianteId })
        .orderBy('n.estudianteId', 'ASC')
        .addOrderBy('n.createdAt', 'ASC')
        .getMany()
        .then((notas) => {
          const grupos = new Map<string, Nota[]>();
          notas.forEach((n) => {
            if (!grupos.has(n.estudianteId)) grupos.set(n.estudianteId, []);
            grupos.get(n.estudianteId).push(n);
          });
          for (const lista of grupos.values()) {
            if (lista[posicion] && lista[posicion].descripcion) return lista[posicion];
          }
          return null;
        });
      if (otraNotaEnPosicion) descripcionFinal = otraNotaEnPosicion.descripcion;
    }

    nota.descripcion = descripcionFinal;
    const notaGuardada = await this.notasRepository.save(nota);

    // Si se guardó con descripcion, propagar a otros estudiantes en la misma posición
    if (descripcionFinal) {
      const todasNotas = await this.notasRepository.find({
        where: { asignacionId: dto.asignacionId, desempenoId: dto.desempenoId },
        order: { estudianteId: 'ASC', createdAt: 'ASC' },
      });
      const porEstudiante = new Map<string, Nota[]>();
      todasNotas.forEach((n) => {
        if (n.estudianteId === dto.estudianteId) return; // skip el actual
        if (!porEstudiante.has(n.estudianteId)) porEstudiante.set(n.estudianteId, []);
        porEstudiante.get(n.estudianteId).push(n);
      });
      for (const listaNotas of porEstudiante.values()) {
        const notaAPropagar = listaNotas[posicion];
        if (notaAPropagar && notaAPropagar.descripcion !== descripcionFinal) {
          await this.notasRepository.update(notaAPropagar.id, { descripcion: descripcionFinal });
        }
      }
    }

    await this.auditoriaRepository.save({
      colegioId: asignacion.curso.colegioId,
      usuarioId: profesorId,
      entidad: 'NOTA',
      entidadId: notaGuardada.id,
      operacion: 'CREATE',
      valorNuevo: { estudianteId: notaGuardada.estudianteId, valor: notaGuardada.valor },
      ipAddress,
      deviceId: dto.deviceId,
      userAgent,
    });

    return notaGuardada;
  }

  async actualizarNota(notaId: string, dto: UpdateNotaDto, profesorId: string, ipAddress: string): Promise<Nota> {
    const nota = await this.notasRepository.findOne({
      where: { id: notaId },
      relations: ['asignacion'],
    });
    if (!nota) throw new NotFoundException('Nota no encontrada');
    if (nota.profesorId !== profesorId) throw new ForbiddenException('No puedes editar notas de otros profesores');

    const asignacion = await this.profesorAsignacionRepository.findOne({
      where: { id: nota.asignacionId },
      relations: ['periodo'],
    });
    if (asignacion.periodo.cerrado) throw new ForbiddenException('Periodo cerrado');
    if (new Date() > asignacion.periodo.fechaCierre) throw new ForbiddenException('Fecha de cierre excedida');

    const valorAnterior = { valor: nota.valor, descripcion: nota.descripcion };
    if (dto.valor !== undefined) {
      if (dto.valor < 1.0 || dto.valor > 5.0) throw new BadRequestException('Nota debe estar entre 1.0 y 5.0');
      nota.valor = dto.valor;
    }
    if (dto.descripcion !== undefined) nota.descripcion = dto.descripcion;
    nota.syncVersion++;
    nota.updatedAt = new Date();

    const notaActualizada = await this.notasRepository.save(nota);

    await this.auditoriaRepository.save({
      colegioId: asignacion.curso.colegioId,
      usuarioId: profesorId,
      entidad: 'NOTA',
      entidadId: nota.id,
      operacion: 'UPDATE',
      valorAnterior,
      valorNuevo: { valor: notaActualizada.valor },
      ipAddress,
    });

    return notaActualizada;
  }

  async eliminarNota(notaId: string, profesorId: string, ipAddress: string): Promise<void> {
    const nota = await this.notasRepository.findOne({ where: { id: notaId } });
    if (!nota) throw new NotFoundException('Nota no encontrada');
    if (nota.profesorId !== profesorId) throw new ForbiddenException('No puedes eliminar notas de otros profesores');

    const asignacion = await this.profesorAsignacionRepository.findOne({
      where: { id: nota.asignacionId },
      relations: ['curso'],
    });

    await this.auditoriaRepository.save({
      colegioId: asignacion.curso.colegioId,
      usuarioId: profesorId,
      entidad: 'NOTA',
      entidadId: nota.id,
      operacion: 'DELETE',
      valorAnterior: { valor: nota.valor },
      ipAddress,
    });

    await this.notasRepository.remove(nota);
  }

  async obtenerPromedioDesempeno(estudianteId: string, desempenoId: string): Promise<{ promedio: number; cantidadNotas: number; tieneRecuperacion: boolean }> {
    const recuperacion = await this.recuperacionesRepository.findOne({
      where: { estudianteId, desempenoId },
    });
    if (recuperacion) return { promedio: recuperacion.valor, cantidadNotas: 1, tieneRecuperacion: true };

    const notas = await this.notasRepository.find({ where: { estudianteId, desempenoId } });
    if (notas.length === 0) return { promedio: 0, cantidadNotas: 0, tieneRecuperacion: false };

    const suma = notas.reduce((acc, nota) => acc + nota.valor, 0);
    return { promedio: Math.round((suma / notas.length) * 10) / 10, cantidadNotas: notas.length, tieneRecuperacion: false };
  }

  async obtenerNotas(filtros: any): Promise<Nota[]> {
    let query = this.notasRepository.createQueryBuilder('nota');
    if (filtros.asignacionId) query = query.where('nota.asignacionId = :asignacionId', { asignacionId: filtros.asignacionId });
    if (filtros.estudianteId) query = query.andWhere('nota.estudianteId = :estudianteId', { estudianteId: filtros.estudianteId });
    if (filtros.desempenoId) query = query.andWhere('nota.desempenoId = :desempenoId', { desempenoId: filtros.desempenoId });
    if (filtros.rol === 'PROFESOR') query = query.andWhere('nota.profesorId = :profesorId', { profesorId: filtros.profesorId });
    return await query.orderBy('nota.createdAt', 'DESC').getMany();
  }

  async obtenerNotaPorId(notaId: string, profesorId: string, rol: string): Promise<Nota> {
    const nota = await this.notasRepository.findOne({
      where: { id: notaId },
      relations: ['profesor', 'estudiante', 'desempeno', 'asignacion'],
    });
    if (!nota) throw new NotFoundException('Nota no encontrada');
    if (rol === 'PROFESOR' && nota.profesorId !== profesorId) throw new ForbiddenException('No tienes permiso');
    return nota;
  }

  async crearRecuperacion(notaId: string, dto: CrearRecuperacionDto, usuarioId: string, rol: string): Promise<Recuperacion> {
    const desempeno = await this.desempenosRepository.findOne({
      where: { id: dto.desempenoId },
      relations: ['periodo'],
    });
    if (!desempeno) throw new NotFoundException('Desempeño no encontrado');
    if (desempeno.periodo.cerrado) throw new ForbiddenException('Periodo cerrado');

    const existente = await this.recuperacionesRepository.findOne({
      where: { desempenoId: dto.desempenoId, estudianteId: dto.estudianteId },
    });
    if (existente) throw new BadRequestException('Ya existe una recuperación para este desempeño');

    const recuperacion = this.recuperacionesRepository.create({
      desempenoId: dto.desempenoId,
      estudianteId: dto.estudianteId,
      profesorId: usuarioId,
      valor: dto.valor,
      justificacion: dto.justificacion,
    });
    return await this.recuperacionesRepository.save(recuperacion);
  }

  async obtenerPromedios(estudianteId: string, periodId: string, usuarioId: string, rol: string): Promise<any> {
    const desempenos = await this.desempenosRepository.find({
      where: { periodoId: periodId },
      order: { orden: 'ASC' },
    });
    if (desempenos.length === 0) throw new NotFoundException('No hay desempeños en este período');

    const desempenosConPromedio = await Promise.all(
      desempenos.map(async (d) => {
        const { promedio, cantidadNotas, tieneRecuperacion } = await this.obtenerPromedioDesempeno(estudianteId, d.id);
        return { nombre: d.nombre, id: d.id, porcentaje: d.porcentaje, promedio, cantidadNotas, tieneRecuperacion };
      }),
    );

    const desempenosActivos = desempenosConPromedio.filter(d => d.promedio > 0);
    const notaFinal = desempenosActivos.length > 0
      ? Math.round((desempenosActivos.reduce((suma, d) => suma + d.promedio, 0) / desempenosActivos.length) * 10) / 10
      : 0;
    return { estudianteId, periodId, desempenos: desempenosConPromedio, notaFinal };
  }

  async getMisMaterias(profesorId: string) {
    const asignaciones = await this.profesorAsignacionRepository.find({
      where: { profesorId, activa: true },
      relations: ['materia'],
    });
    const materiasUnicas = new Map();
    asignaciones.forEach(a => {
      if (!materiasUnicas.has(a.materia.id)) {
        materiasUnicas.set(a.materia.id, {
          id: a.materia.id,
          nombre: a.materia.nombre,
          codigo: a.materia.codigo,
          asignacionId: a.id,
        });
      }
    });
    return Array.from(materiasUnicas.values());
  }

  async getPeriodos(profesorId: string) {
    const asignaciones = await this.profesorAsignacionRepository.find({
      where: { profesorId, activa: true },
      relations: ['periodo'],
    });
    const periodosUnicos = new Map();
    asignaciones.forEach(a => {
      if (a.periodo && !periodosUnicos.has(a.periodo.id)) {
        periodosUnicos.set(a.periodo.id, a.periodo);
      }
    });
    return Array.from(periodosUnicos.values()).sort((a, b) => a.numero - b.numero);
  }

  async getAsignacion(materiaId: string, periodoId: string, profesorId: string) {
    const asignacion = await this.profesorAsignacionRepository.findOne({
      where: { materiaId, periodoId, profesorId, activa: true },
    });
    if (!asignacion) throw new ForbiddenException('No tienes asignación activa para esta materia en este período');
    return { asignacionId: asignacion.id, cursoId: asignacion.cursoId };
  }

  async getEstudiantesByAsignacion(asignacionId: string, profesorId: string): Promise<Estudiante[]> {
    const asignacion = await this.profesorAsignacionRepository.findOne({
      where: { id: asignacionId, profesorId },
    });
    if (!asignacion) throw new ForbiddenException('No tienes acceso a esta asignación');
    return await this.estudiantesRepository.find({
      where: { cursoId: asignacion.cursoId, activo: true },
      order: { apellido: 'ASC', nombre: 'ASC' },
    });
  }

  async getDesempenos(periodoId: string): Promise<Desempeno[]> {
    return await this.desempenosRepository.find({
      where: { periodoId },
      order: { orden: 'ASC' },
    });
  }
  async getHorario(profesorId: string, dia?: number): Promise<any[]> {
    const query = `
      SELECT 
        h.id,
        h."diaSemana",
        h."horaInicio",
        h."horaFin",
        h.jornada,
        m.nombre as materia,
        c.nombre as curso
      FROM horarios h
      JOIN profesor_asignaciones pa ON pa.id = h."asignacionId"
      JOIN materias m ON m.id = pa."materiaId"
      JOIN cursos c ON c.id = pa."cursoId"
      WHERE h."profesorId" = $1
      ${dia ? 'AND h."diaSemana" = $2' : ''}
      ORDER BY h."diaSemana", h."horaInicio"
    `;
    const params = dia ? [profesorId, dia] : [profesorId];
    return await this.notasRepository.query(query, params);
  }
  async getPlanilla(asignacionId: string, periodoId: string, profesorId: string): Promise<any[]> {
    const asignacion = await this.profesorAsignacionRepository.findOne({
      where: { id: asignacionId, profesorId },
    });
    if (!asignacion) throw new ForbiddenException('No tienes acceso a esta asignacion');

    const estudiantes = await this.estudiantesRepository.find({
      where: { cursoId: asignacion.cursoId, activo: true },
      order: { apellido: 'ASC', nombre: 'ASC' },
    });

    const desempenos = await this.desempenosRepository.find({
      where: { periodoId, materiaId: asignacion.materiaId },
      order: { orden: 'ASC' },
    });

    const planilla = await Promise.all(
      estudiantes.map(async (est) => {
        const desempenosDetalle = await Promise.all(
          desempenos.map(async (d) => {
            const notas = await this.notasRepository.find({
              where: { estudianteId: est.id, desempenoId: d.id, asignacionId: asignacionId },
              order: { createdAt: 'ASC' },
            });
            const promedio = notas.length > 0
              ? Math.round((notas.reduce((a, n) => a + Number(n.valor), 0) / notas.length) * 10) / 10
              : 0;
            return {
              nombre: d.nombre,
              promedio,
              notas: notas.map(n => ({
                id: n.id,
                valor: Number(n.valor),
                descripcion: n.descripcion || '',
              })),
            };
          }),
        );

        // Nota final = promedio simple de desempeños con al menos 1 nota
        const desempenosConNotas = desempenosDetalle.filter(d => d.promedio > 0);
        const notaFinalCalculada = desempenosConNotas.length > 0
          ? Math.round((desempenosConNotas.reduce((a, d) => a + d.promedio, 0) / desempenosConNotas.length) * 10) / 10
          : 0;

        // Contar faltas
        const asistencias = await this.asistenciaRepository.find({
          where: { estudianteId: est.id, asignacionId: asignacionId },
        });
        const totalFaltas = asistencias.filter(
          (a) => a.estado === 'JUSTIFICADA' || a.estado === 'INJUSTIFICADA',
        ).length;

        return {
          estudianteId: est.id,
          nombre: `${est.apellido}, ${est.nombre}`,
          numeroDocumento: est.numeroDocumento,
          desempenos: desempenosDetalle,
          notaFinal: notaFinalCalculada,
          totalFaltas,
        };
      }),
    );

    return planilla;
  }

  /**
   * Obtiene la descripción sugerida para una posición de nota
   * (la misma posición en el mismo desempeño de otro estudiante)
   */
  async getDescripcionSugerida(
    asignacionId: string,
    desempenoId: string,
    posicion: number,
    profesorId: string,
  ): Promise<{ descripcion: string | null }> {
    const asignacion = await this.profesorAsignacionRepository.findOne({
      where: { id: asignacionId, profesorId },
    });
    if (!asignacion) throw new ForbiddenException('No tienes acceso a esta asignación');

    // Buscar todas las notas de ese desempeño en esa asignación
    const todasNotas = await this.notasRepository.find({
      where: { asignacionId, desempenoId },
      order: { estudianteId: 'ASC', createdAt: 'ASC' },
    });

    // Agrupar por estudiante y tomar la nota en la posición indicada
    const porEstudiante = new Map<string, Nota[]>();
    todasNotas.forEach((n) => {
      if (!porEstudiante.has(n.estudianteId)) porEstudiante.set(n.estudianteId, []);
      porEstudiante.get(n.estudianteId).push(n);
    });

    for (const notas of porEstudiante.values()) {
      if (notas[posicion] && notas[posicion].descripcion) {
        return { descripcion: notas[posicion].descripcion };
      }
    }

    return { descripcion: null };
  }

  /**
   * Boletín consolidado de un curso en un período.
   * Retorna todos los estudiantes con sus notas finales por materia,
   * su promedio general y su puesto (ranking mayor a menor).
   * Muestra TODAS las materias del colegio aunque no tengan asignación activa.
   */
  async getBoletin(cursoId: string, periodoId: string, profesorId: string): Promise<any> {
    // Validar acceso — el profesor debe tener al menos una asignación en este curso/período
    const miAsignacion = await this.profesorAsignacionRepository.findOne({
      where: { cursoId, periodoId, profesorId, activa: true },
      relations: ['curso'],
    });
    if (!miAsignacion) {
      throw new ForbiddenException('No tienes asignaciones en este curso y período');
    }

    const colegioId = miAsignacion.curso.colegioId;

    // Todas las materias del colegio ordenadas alfabéticamente
    const todasMaterias = await this.desempenosRepository.query(
      'SELECT id, nombre, codigo FROM materias WHERE "colegioId" = $1 ORDER BY nombre',
      [colegioId],
    );

    // Todas las asignaciones del curso en este período (todos los profesores)
    const todasAsignaciones = await this.profesorAsignacionRepository.find({
      where: { cursoId, periodoId, activa: true },
    });

    // Mapa materiaId → asignacionId
    const asigPorMateria = new Map<string, string>();
    todasAsignaciones.forEach((a) => asigPorMateria.set(a.materiaId, a.id));

    // Materias con su asignacionId (null si no tiene asignación)
    const materias = todasMaterias.map((m: any) => ({
      id: m.id,
      nombre: m.nombre,
      codigo: m.codigo || m.nombre.slice(0, 4).toUpperCase(),
      asignacionId: asigPorMateria.get(m.id) || null,
    }));

    // Estudiantes del curso
    const estudiantes = await this.estudiantesRepository.find({
      where: { cursoId, activo: true },
      order: { apellido: 'ASC', nombre: 'ASC' },
    });

    // Desempeños del período
    const desempenos = await this.desempenosRepository.find({
      where: { periodoId, materiaId: asignacion.materiaId },
      order: { orden: 'ASC' },
    });

    // Calcular nota final por materia por estudiante
    const filas = await Promise.all(
      estudiantes.map(async (est) => {
        const notasPorMateria: Record<string, number> = {};
        let sumaNotas = 0;
        let cantMaterias = 0;

        for (const materia of materias) {
          // Si la materia no tiene asignación activa en este período, nota = 0
          if (!materia.asignacionId) { notasPorMateria[materia.id] = 0; continue; }

          // Promedio simple de desempeños
          let sumaDesempenos = 0;
          let contDesempenos = 0;
          for (const d of desempenos) {
            const notas = await this.notasRepository.find({
              where: { estudianteId: est.id, desempenoId: d.id, asignacionId: materia.asignacionId },
            });
            if (notas.length > 0) {
              const prom = notas.reduce((a, n) => a + Number(n.valor), 0) / notas.length;
              sumaDesempenos += prom;
              contDesempenos++;
            }
          }

          const notaMateria = contDesempenos > 0
            ? Math.round((sumaDesempenos / contDesempenos) * 10) / 10
            : 0;

          notasPorMateria[materia.id] = notaMateria;
          if (notaMateria > 0) { sumaNotas += notaMateria; cantMaterias++; }
        }

        const promedio = cantMaterias > 0
          ? Math.round((sumaNotas / cantMaterias) * 10) / 10
          : 0;

        return {
          estudianteId: est.id,
          nombre: `${est.apellido}, ${est.nombre}`,
          notasPorMateria,
          promedio,
          puesto: 0, // se calcula después
        };
      }),
    );

    // Calcular puestos: ordenar de mayor a menor promedio
    const filasOrdenadas = [...filas].sort((a, b) => b.promedio - a.promedio);
    filasOrdenadas.forEach((f, idx) => { f.puesto = idx + 1; });

    // Ordenar de vuelta alfabéticamente para mostrar
    filas.sort((a, b) => a.nombre.localeCompare(b.nombre));
    // Asignar puestos calculados
    filas.forEach((f) => {
      const conPuesto = filasOrdenadas.find((fp) => fp.estudianteId === f.estudianteId);
      f.puesto = conPuesto?.puesto || 0;
    });

    return { materias, estudiantes: filas };
  }

}