import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * CURRENT USER DECORATOR
 * 
 * Inyecta el usuario actual desde req.user en los parámetros de la función
 * 
 * Uso:
 * @Post('notas')
 * async createNota(
 *   @Body() dto: CreateNotaDto,
 *   @CurrentUser() user: any
 * ) {
 *   console.log(user.id);    // UUID del usuario
 *   console.log(user.email); // Email
 *   console.log(user.rol);   // PROFESOR, RECTOR, etc.
 * }
 * 
 * Sin este decorator, tendrías que hacer:
 * async createNota(
 *   @Body() dto: CreateNotaDto,
 *   @Request() req
 * ) {
 *   const user = req.user; // Más verboso
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
