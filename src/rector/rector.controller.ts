import {
  Controller, Get, Post, Put, Param, Body,
  UseGuards, HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { RectorService } from './rector.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/rector')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RECTOR')
export class RectorController {
  constructor(private rectorService: RectorService) {}

  // ── Períodos ──────────────────────────────────────────────────────────────

  @Get('periodos')
  async getPeriodos() {
    return await this.rectorService.getPeriodos();
  }

  @Put('periodos/:id/abrir')
  @HttpCode(HttpStatus.OK)
  async abrirPeriodo(@Param('id') id: string) {
    return await this.rectorService.abrirPeriodo(id);
  }

  @Put('periodos/:id/cerrar')
  @HttpCode(HttpStatus.OK)
  async cerrarPeriodo(@Param('id') id: string) {
    return await this.rectorService.cerrarPeriodo(id);
  }

  // ── Profesores ────────────────────────────────────────────────────────────

  @Get('profesores')
  async getProfesores() {
    return await this.rectorService.getProfesores();
  }

  @Get('profesores/:id/asignaciones')
  async getAsignacionesProfesor(@Param('id') id: string) {
    return await this.rectorService.getAsignacionesProfesor(id);
  }

  @Post('profesores/:id/asignar')
  @HttpCode(HttpStatus.OK)
  async asignarMateria(
    @Param('id') profesorId: string,
    @Body() body: any,
  ) {
    return await this.rectorService.asignarMateria(
      profesorId,
      body.materiaId,
      body.cursoId,
      body.periodoId,
    );
  }

  @Put('asignaciones/:id/desactivar')
  @HttpCode(HttpStatus.OK)
  async desactivarAsignacion(@Param('id') id: string) {
    return await this.rectorService.desactivarAsignacion(id);
  }

  // ── Reportes ──────────────────────────────────────────────────────────────

  @Get('reportes/resumen')
  async getResumenGeneral() {
    return await this.rectorService.getResumenGeneral();
  }

  @Get('reportes/asistencia')
  async getResumenAsistencia(@Query('cursoId') cursoId: string) {
    return await this.rectorService.getResumenAsistencia(cursoId);
  }

  // ── Catálogos ─────────────────────────────────────────────────────────────

  @Get('materias')
  async getMaterias() {
    return await this.rectorService.getMaterias();
  }

  @Get('cursos')
  async getCursos() {
    return await this.rectorService.getCursos();
  }
}