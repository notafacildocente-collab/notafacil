import {
  Controller, Post, Get, Body, Query,
  Param, UseGuards, HttpCode, HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { AsistenciaService, RegistroAsistenciaDto } from './asistencia.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/asistencia')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsistenciaController {
  constructor(private asistenciaService: AsistenciaService) {}

  @Post('guardar')
  @Roles('PROFESOR')
  @HttpCode(HttpStatus.OK)
  async guardar(@Body() body: any, @CurrentUser() user: any) {
    const { asignacionId, fecha, registros } = body;
    if (!asignacionId || !fecha || !registros?.length) {
      throw new BadRequestException('asignacionId, fecha y registros son requeridos');
    }
    return await this.asistenciaService.guardarAsistencia(
      asignacionId,
      fecha,
      registros,
      user.id,
    );
  }

  @Get()
  @Roles('PROFESOR')
  async obtener(
    @Query('asignacionId') asignacionId: string,
    @Query('fecha') fecha: string,
    @CurrentUser() user: any,
  ) {
    if (!asignacionId || !fecha) {
      throw new BadRequestException('asignacionId y fecha son requeridos');
    }
    return await this.asistenciaService.obtenerAsistencia(asignacionId, fecha, user.id);
  }

  @Get('resumen-clase')
  @Roles('PROFESOR')
  async resumenClase(
    @Query('asignacionId') asignacionId: string,
    @CurrentUser() user: any,
  ) {
    if (!asignacionId) throw new BadRequestException('asignacionId es requerido');
    return await this.asistenciaService.resumenClase(asignacionId, user.id);
  }

  @Get('resumen/:estudianteId')
  @Roles('PROFESOR')
  async resumenEstudiante(
    @Param('estudianteId') estudianteId: string,
    @Query('asignacionId') asignacionId: string,
    @CurrentUser() user: any,
  ) {
    if (!asignacionId) throw new BadRequestException('asignacionId es requerido');
    return await this.asistenciaService.resumenEstudiante(estudianteId, asignacionId, user.id);
  }
}