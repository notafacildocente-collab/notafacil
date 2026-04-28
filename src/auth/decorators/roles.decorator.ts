import { SetMetadata } from '@nestjs/common';

/**
 * ROLES DECORATOR
 * 
 * Define qué roles pueden acceder a un endpoint
 * 
 * Uso:
 * @Roles('RECTOR', 'COORDINADOR')
 * @Post('cierre-periodo')
 * async cerrarPeriodo() { ... }
 * 
 * Se usa junto con @UseGuards(RolesGuard)
 */
export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
