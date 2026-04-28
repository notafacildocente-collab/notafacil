import {
  Controller, Post, Get, Put, Delete, Param, Body,
  Query, HttpCode, HttpStatus, UseGuards, Request,
  BadRequestException,
} from '@nestjs/common';
import { NotasService } from './notas.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateNotaDto, UpdateNotaDto, CrearRecuperacionDto } from './dto/nota.dto';

@Controller('api/notas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotasController {
  constructor(private notasService: NotasService) {}

  @Post()
  @Roles('PROFESOR')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateNotaDto, @CurrentUser() user: any, @Request() req) {
    const ipAddress = req.ip || req.socket?.remoteAddress || 'UNKNOWN';
    const userAgent = req.get('User-Agent');
    const deviceId = req.get('X-Device-ID');
    return await this.notasService.crearNota({ ...dto, deviceId }, user.id, ipAddress, userAgent);
  }

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('asignacionId') asignacionId?: string,
    @Query('estudianteId') estudianteId?: string,
    @Query('desempenoId') desempenoId?: string,
    @Query('periodId') periodId?: string,
  ) {
    return await this.notasService.obtenerNotas({ asignacionId, estudianteId, desempenoId, periodId, profesorId: user.id, rol: user.rol });
  }

  @Get('mis-materias')
  @Roles('PROFESOR')
  async getMisMaterias(@CurrentUser() user: any) {
    return await this.notasService.getMisMaterias(user.id);
  }

  @Get('periodos')
  async getPeriodos(@CurrentUser() user: any) {
    return await this.notasService.getPeriodos(user.id);
  }

  // Busca el asignacionId para materiaId+periodoId del profesor autenticado
  // GET /api/notas/asignacion?materiaId=&periodoId=
  @Get('asignacion')
  @Roles('PROFESOR')
  async getAsignacion(
    @CurrentUser() user: any,
    @Query('materiaId') materiaId: string,
    @Query('periodoId') periodoId: string,
  ) {
    if (!materiaId || !periodoId) {
      throw new BadRequestException('materiaId y periodoId son requeridos');
    }
    return await this.notasService.getAsignacion(materiaId, periodoId, user.id);
  }

  // Estudiantes del curso de una asignación
  // GET /api/notas/estudiantes/:asignacionId
  @Get('estudiantes/:asignacionId')
  @Roles('PROFESOR')
  async getEstudiantes(
    @Param('asignacionId') asignacionId: string,
    @CurrentUser() user: any,
  ) {
    return await this.notasService.getEstudiantesByAsignacion(asignacionId, user.id);
  }

  // Desempeños de un período (Cognitivo, Procedimental, Actitudinal)
  // GET /api/notas/desempenos/:periodoId
  @Get('horario')
  @Roles('PROFESOR')
  async getHorario(
    @CurrentUser() user: any,
    @Query('dia') dia: string,
  ) {
    return await this.notasService.getHorario(user.id, dia ? parseInt(dia) : null);
  }
  @Get('boletin')
  @Roles('PROFESOR')
  async getBoletin(
    @CurrentUser() user: any,
    @Query('cursoId') cursoId: string,
    @Query('periodoId') periodoId: string,
  ) {
    if (!cursoId || !periodoId) throw new BadRequestException('cursoId y periodoId son requeridos');
    return await this.notasService.getBoletin(cursoId, periodoId, user.id);
  }

    @Get('descripcion-sugerida')
  @Roles('PROFESOR')
  async getDescripcionSugerida(
    @CurrentUser() user: any,
    @Query('asignacionId') asignacionId: string,
    @Query('desempenoId') desempenoId: string,
    @Query('posicion') posicion: string,
  ) {
    if (!asignacionId || !desempenoId || posicion === undefined) {
      throw new BadRequestException('asignacionId, desempenoId y posicion son requeridos');
    }
    return await this.notasService.getDescripcionSugerida(
      asignacionId, desempenoId, parseInt(posicion), user.id,
    );
  }

    @Get('planilla')
  @Roles('PROFESOR')
  async getPlanilla(
    @CurrentUser() user: any,
    @Query('asignacionId') asignacionId: string,
    @Query('periodoId') periodoId: string,
  ) {
    if (!asignacionId || !periodoId) throw new BadRequestException('asignacionId y periodoId son requeridos');
    return await this.notasService.getPlanilla(asignacionId, periodoId, user.id);
  }
  @Get('desempenos/:periodoId')
  async getDesempenos(@Param('periodoId') periodoId: string) {
    return await this.notasService.getDesempenos(periodoId);
  }

  @Get('promedio/:estudianteId')
  async getPromedios(
    @Param('estudianteId') estudianteId: string,
    @Query('periodId') periodId: string,
    @CurrentUser() user: any,
  ) {
    if (!periodId) throw new BadRequestException('periodId es requerido');
    return await this.notasService.obtenerPromedios(estudianteId, periodId, user.id, user.rol);
  }

  // IMPORTANTE: @Get(':id') SIEMPRE al final - NestJS resuelve rutas en orden
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return await this.notasService.obtenerNotaPorId(id, user.id, user.rol);
  }

  @Put(':id')
  @Roles('PROFESOR')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateNotaDto, @CurrentUser() user: any, @Request() req) {
    const ipAddress = req.ip || req.socket?.remoteAddress || 'UNKNOWN';
    return await this.notasService.actualizarNota(id, dto, user.id, ipAddress);
  }

  @Delete(':id')
  @Roles('PROFESOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentUser() user: any, @Request() req) {
    const ipAddress = req.ip || req.socket?.remoteAddress || 'UNKNOWN';
    await this.notasService.eliminarNota(id, user.id, ipAddress);
  }

  @Post(':notaId/recuperacion')
  @Roles('PROFESOR', 'COORDINADOR')
  @HttpCode(HttpStatus.CREATED)
  async crearRecuperacion(@Param('notaId') notaId: string, @Body() dto: CrearRecuperacionDto, @CurrentUser() user: any) {
    return await this.notasService.crearRecuperacion(notaId, dto, user.id, user.rol);
  }
}
