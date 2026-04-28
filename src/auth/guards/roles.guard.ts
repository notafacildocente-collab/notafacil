import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * ROLES GUARD - Control de acceso basado en roles (RBAC)
 * 
 * Valida que el usuario tiene uno de los roles requeridos
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('RECTOR', 'COORDINADOR')
 * @Post('cierre-periodo')
 * async cerrarPeriodo(@Request() req) {
 *   // Solo RECTOR o COORDINADOR pueden acceder
 * }
 * 
 * Roles disponibles:
 * - RECTOR: Acceso total al colegio
 * - COORDINADOR: Acceso a su sede
 * - PROFESOR: Acceso a sus materias/grupos
 * - SECRETARIA: Lectura solamente
 * 
 * Matriz de permisos en ARQUITECTURA.md
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Obtener roles requeridos del decorador @Roles(...)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si no hay @Roles() decorador, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 2. Obtener usuario del request
    // (fue inyectado por JwtStrategy en req.user)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.rol) {
      throw new ForbiddenException('Usuario sin rol');
    }

    // 3. Validar que el rol del usuario está en los roles requeridos
    const hasRole = requiredRoles.includes(user.rol);

    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado. Rol requerido: ${requiredRoles.join(' o ')}. Rol actual: ${user.rol}`,
      );
    }

    return true;
  }
}
