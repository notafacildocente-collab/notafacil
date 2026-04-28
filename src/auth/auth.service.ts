import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

import { Usuario, Rol, Colegio } from '../database/entities';
import { LoginDto, RegisterDto, AceptarPoliticaDto, LoginResponseDto } from './dto/auth.dto';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
    @InjectRepository(Rol)
    private rolesRepository: Repository<Rol>,
    @InjectRepository(Colegio)
    private colegiosRepository: Repository<Colegio>,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto, ipAddress: string): Promise<LoginResponseDto> {
    const usuario = await this.usuariosRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
      relations: ['rol', 'colegio'],
    });

    if (!usuario) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    if (!usuario.activo) {
      throw new ForbiddenException('Usuario inactivo');
    }

    const passwordValida = await bcrypt.compare(dto.password, usuario.passwordHash);
    if (!passwordValida) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    if (!usuario.politicaAceptada) {
      throw new ForbiddenException('Debe aceptar la política de protección de datos');
    }

    await this.usuariosRepository.update(usuario.id, {
      ultimoLogin: new Date(),
    });

    const accessToken = this.jwtService.sign(
      {
        sub: usuario.id,
        email: usuario.email,
        rol: usuario.rol.nombre,
        colegioId: usuario.colegioId,
      },
      { expiresIn: '7d' },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: usuario.id,
        type: 'refresh',
      },
      { expiresIn: '7d' },
    );

    console.log(`[AUTH] Login exitoso: ${usuario.email} desde IP ${ipAddress}`);

    return {
      accessToken,
      refreshToken,
      usuarioId: usuario.id,
      rol: usuario.rol.nombre,
      nombre: usuario.nombre,
    };
  }

  async registrar(dto: RegisterDto, colegioId: string, rolId: string): Promise<Usuario> {
    const usuarioExistente = await this.usuariosRepository.findOne({
      where: { email: dto.email, colegioId },
    });

    if (usuarioExistente) {
      throw new BadRequestException('Email ya registrado en este colegio');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const usuario = this.usuariosRepository.create({
      email: dto.email,
      nombre: dto.nombre,
      documento: dto.documento,
      telefono: dto.telefono,
      passwordHash,
      colegioId,
      rolId,
      activo: true,
      politicaAceptada: false,
    });

    return await this.usuariosRepository.save(usuario);
  }

  async aceptarPolitica(usuarioId: string): Promise<any> {
    const usuario = await this.usuariosRepository.findOne({ where: { id: usuarioId } });

    if (!usuario) {
      throw new BadRequestException('Usuario no encontrado');
    }

    usuario.politicaAceptada = true;
    usuario.politicaAceptadaAt = new Date();

    return await this.usuariosRepository.save(usuario);
  }

  async refreshToken(refreshTokenString: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshTokenString, {
        secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Token inválido');
      }

      const usuario = await this.usuariosRepository.findOne({
        where: { id: payload.sub },
        relations: ['rol'],
      });

      if (!usuario || !usuario.activo) {
        throw new UnauthorizedException('Usuario no encontrado o inactivo');
      }

      const accessToken = this.jwtService.sign(
        {
          sub: usuario.id,
          email: usuario.email,
          rol: usuario.rol.nombre,
          colegioId: usuario.colegioId,
        },
        { expiresIn: '7d' },
      );

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async cambiarPassword(usuarioId: string, passwordActual: string, passwordNueva: string): Promise<void> {
    const usuario = await this.usuariosRepository.findOne({ where: { id: usuarioId } });

    if (!usuario) throw new BadRequestException('Usuario no encontrado');

    const passwordValida = await bcrypt.compare(passwordActual, usuario.passwordHash);
    if (!passwordValida) throw new BadRequestException('Contraseña actual incorrecta');

    if (passwordNueva.length < 8) throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');

    usuario.passwordHash = await bcrypt.hash(passwordNueva, 12);
    await this.usuariosRepository.save(usuario);
  }

  async solicitarRecuperacion(email: string): Promise<void> {
    const usuario = await this.usuariosRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!usuario) return; // No revelar si el email existe

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    usuario.resetCodigo = codigo;
    usuario.resetExpira = expira;
    await this.usuariosRepository.save(usuario);

    await transporter.sendMail({
      from: `"NotaFácil" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Código de recuperación de contraseña',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
          <h2 style="color: #1a3a6b;">NotaFácil Docente</h2>
          <p>Recibiste este email porque solicitaste recuperar tu contraseña.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Tu código de verificación es:</p>
            <h1 style="color: #1a3a6b; font-size: 48px; margin: 10px 0; letter-spacing: 8px;">${codigo}</h1>
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">Expira en 15 minutos</p>
          </div>
          <p style="color: #6b7280; font-size: 12px;">Si no solicitaste esto, ignora este email.</p>
        </div>
      `,
    });
  }

  async resetPassword(email: string, codigo: string, passwordNueva: string): Promise<void> {
    const usuario = await this.usuariosRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!usuario) throw new BadRequestException('Email no encontrado');
    if (usuario.resetCodigo !== codigo) throw new BadRequestException('Código incorrecto');
    if (new Date() > usuario.resetExpira) throw new BadRequestException('Código expirado');

    usuario.passwordHash = await bcrypt.hash(passwordNueva, 12);
    usuario.resetCodigo = null;
    usuario.resetExpira = null;
    await this.usuariosRepository.save(usuario);
  }
}