import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT AUTH GUARD
 * 
 * Valida que el request tenga un JWT válido
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard)
 * async createNota(@Request() req) {
 *   const usuarioId = req.user.id; // Usuario inyectado por JwtStrategy
 * }
 * 
 * Si no hay JWT válido:
 * - Lanza 401 Unauthorized
 * - El mensaje NO expone detalles del JWT
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor() {
    super();
  }

  /**
   * handleRequest() es llamado por passport después de validate()
   * 
   * Parámetros:
   * - err: Error si algo falló
   * - user: Usuario retornado por JwtStrategy.validate()
   * - info: Información adicional
   */
  handleRequest(err, user, info) {
    if (err || !user) {
      // Mensaje genérico: no exponer detalles del JWT
      throw err || new Error('Acceso no autorizado');
    }
    return user;
  }
}
