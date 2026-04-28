import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../../database/entities';

/**
 * JWT STRATEGY - Estrategia Passport para validar JWT
 * 
 * Responsabilidades:
 * - Extraer JWT del header Authorization: Bearer <token>
 * - Validar firma del token
 * - Cargar usuario desde BD
 * - Inyectar usuario en req.user
 * 
 * Uso:
 * @UseGuards(AuthGuard('jwt'))
 * async getProfile(@Request() req) {
 *   const user = req.user; // Usuario inyectado por esta estrategia
 * }
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
  ) {
    super({
      // 1. Extraer JWT del header Authorization
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      
      // 2. Validar que el secret sea el correcto
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
      
      // 3. Validar que el token no haya expirado
      ignoreExpiration: false,
    });
  }

  /**
   * validate() es llamado por Passport después de validar la firma del JWT
   * 
   * El payload viene del JWT decodeado (claims)
   * Ejemplo payload:
   * {
   *   sub: "user-uuid",
   *   email: "profesor@colegio.edu.co",
   *   rol: "PROFESOR",
   *   colegioId: "colegio-uuid",
   *   iat: 1681234567,
   *   exp: 1681235467
   * }
   */
  async validate(payload: any) {
    // 1. Buscar usuario en BD para garantizar que existe y está activo
    const usuario = await this.usuariosRepository.findOne({
      where: { id: payload.sub },
      relations: ['rol', 'colegio'],
    });

    if (!usuario) {
      // Usuario ya no existe (fue eliminado)
      return null;
    }

    if (!usuario.activo) {
      // Usuario fue desactivado
      return null;
    }

    if (!usuario.politicaAceptada) {
      // Usuario no ha aceptado política de datos (Ley 1581)
      return null;
    }

    // 2. Devolver usuario decorado
    // Este usuario será inyectado en req.user
    return {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol.nombre,
      colegioId: usuario.colegioId,
      nombre: usuario.nombre,
      // Mantener el payload original para debugging
      _payload: payload,
    };
  }
}
