import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto, RefreshTokenDto, AceptarPoliticaDto } from './dto/auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Colegio } from '../database/entities/colegio.entity';

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @InjectRepository(Colegio)
    private colegioRepository: Repository<Colegio>,
  ) {}

  @Get('config')
  async getConfig() {
    const colegio = await this.colegioRepository.findOne({ where: {} });
    if (!colegio) return { nombre: 'NotaFácil', logoUrl: null };
    return {
      nombre: colegio.nombre,
      logoUrl: colegio['logoUrl'] || null,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Request() req) {
    const ipAddress = req.ip || req.socket?.remoteAddress || 'UNKNOWN';
    return await this.authService.login(dto, ipAddress);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return await this.authService.refreshToken(dto.refreshToken);
  }

  @Post('politica')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async aceptarPolitica(@Body() dto: AceptarPoliticaDto, @CurrentUser() user: any) {
    if (dto.aceptacion !== true) {
      throw new BadRequestException('Debe aceptar la política de protección de datos');
    }
    return await this.authService.aceptarPolitica(user.id);
  }

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProfile(@CurrentUser() user: any) {
    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
      colegioId: user.colegioId,
    };
  }

  @Post('cambiar-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cambiarPassword(@Body() body: any, @CurrentUser() user: any) {
    await this.authService.cambiarPassword(user.id, body.passwordActual, body.passwordNueva);
    return { mensaje: 'Contraseña actualizada correctamente' };
  }

  @Post('recuperar')
  @HttpCode(HttpStatus.OK)
  async solicitarRecuperacion(@Body() body: any) {
    await this.authService.solicitarRecuperacion(body.email);
    return { mensaje: 'Si el email existe, recibirá un código' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: any) {
    await this.authService.resetPassword(body.email, body.codigo, body.passwordNueva);
    return { mensaje: 'Contraseña actualizada correctamente' };
  }
}