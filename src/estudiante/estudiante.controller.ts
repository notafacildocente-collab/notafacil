import {
  Controller, Get, Query, UseGuards, Param,
} from '@nestjs/common';
import { EstudianteService } from './estudiante.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/estudiante')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ESTUDIANTE')
export class EstudianteController {
  constructor(private estudianteService: EstudianteService) {}

  @Get('notas')
  async getNotas(
    @CurrentUser() user: any,
    @Query('periodoId') periodoId?: string,
  ) {
    return await this.estudianteService.getNotas(user.id, periodoId);
  }

  @Get('asistencia')
  async getAsistencia(@CurrentUser() user: any) {
    return await this.estudianteService.getAsistencia(user.id);
  }

  @Get('horario')
  async getHorario(
    @CurrentUser() user: any,
    @Query('dia') dia?: string,
  ) {
    return await this.estudianteService.getHorario(user.id, dia ? parseInt(dia) : null);
  }

  @Get('boletin/:periodoId')
  async getBoletin(
    @CurrentUser() user: any,
    @Param('periodoId') periodoId: string,
  ) {
    return await this.estudianteService.getBoletin(user.id, periodoId);
  }

  @Get('periodos')
  async getPeriodos(@CurrentUser() user: any) {
    return await this.estudianteService.getPeriodos(user.id);
  }

  @Get('perfil')
  async getPerfil(@CurrentUser() user: any) {
    return await this.estudianteService.getPerfil(user.id);
  }
}