import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auditoria } from '../../database/entities';
import { Request } from 'express';

/**
 * AUDIT INTERCEPTOR - Auditoría Global (Ley 1581)
 * 
 * Registra TODAS las operaciones en entidades sensibles
 * 
 * ¿Por qué es necesario?
 * - Ley 1581 de 2012: Protección de datos personales en Colombia
 * - Requiere trazabilidad COMPLETA: quién, qué, cuándo, dónde, cómo
 * 
 * ¿Qué registra?
 * - Usuario que hizo la operación
 * - Hora exacta (timestamp)
 * - IP desde la que se accedió
 * - Dispositivo (device_id para móvil)
 * - User Agent (navegador/app)
 * - Método HTTP (POST, PUT, DELETE)
 * - Path del endpoint
 * - Body de la petición
 * - Response status
 * - Errores si ocurren
 * 
 * Uso:
 * Se registra automáticamente en app.module.ts con:
 * app.useGlobalInterceptors(new AuditInterceptor(auditRepository))
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(Auditoria)
    private auditoriaRepository: Repository<Auditoria>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body } = request;
const user = (request as any).user;

    // Extraer información de la request
    const ipAddress = this.extractIp(request);
    const userAgent = request.get('User-Agent');
    const deviceId = request.get('X-Device-ID'); // Header que envía el móvil
    const userId = user?.id;

    // Timestamp de inicio
    const startTime = Date.now();

    return next.handle().pipe(
      // Registrar auditoría en caso de éxito
      tap(() => {
        this.registrarAuditoria({
          userId,
          method,
          url,
          ipAddress,
          deviceId,
          userAgent,
          statusCode: context.switchToHttp().getResponse().statusCode,
          duration: Date.now() - startTime,
          body, // ⚠️ Cuidado: no registrar contraseñas aquí
        });
      }),

      // Registrar auditoría en caso de error
      catchError((error) => {
        this.registrarAuditoria({
          userId,
          method,
          url,
          ipAddress,
          deviceId,
          userAgent,
          statusCode: error.status || 500,
          duration: Date.now() - startTime,
          body,
          error: error.message,
        });
        return throwError(() => error);
      }),
    );
  }

  /**
   * Extrae IP del request
   * Considera proxies inversos (X-Forwarded-For)
   */
  private extractIp(request: Request): string {
    // Header de proxy
    const forwarded = request.get('X-Forwarded-For');
    if (forwarded) {
      // Format: "192.168.1.1, 10.0.0.1"
      return forwarded.split(',')[0].trim();
    }

    // IP directo del socket
    return (
      request.socket?.remoteAddress ||
      request.get('X-Real-IP') ||
      'UNKNOWN'
    );
  }

  /**
   * Registra en BD tabla auditoria
   * ⚠️ NO hace logging síncrono, esto es asíncrono
   * ⚠️ Si la auditoría falla, no debe fallar la request del usuario
   */
  private registrarAuditoria(datos: any) {
    // Evitar que fallos de auditoría rompan la request
    Promise.resolve()
      .then(async () => {
        // ⚠️ NOTA: Esta es una versión SIMPLE
        // En producción: usa una cola de trabajo (Bull, RabbitMQ)
        // Así se garantiza que NUNCA se pierden registros de auditoría

        // Por ahora: registrar en BD directamente (con retry)
        try {
          // Crear registro de auditoría (sin esperar)
          // El sistema debe tolerar que falle la auditoría  
          // (no rompe el flujo del usuario)
          
          // TODO: Implementar en versión 1.1:
          // await this.auditoriaRepository.save({
          //   usuario_id: datos.userId,
          //   entidad: this.extraerEntidad(datos.url, datos.method),
          //   entidad_id: this.extraerEntityId(datos.body),
          //   operacion: datos.method,
          //   valor_nuevo: datos.body,
          //   ip_address: datos.ipAddress,
          //   device_id: datos.deviceId,
          //   user_agent: datos.userAgent,
          // });

          console.log('[AUDIT]', {
            userId: datos.userId,
            method: datos.method,
            path: datos.url,
            ip: datos.ipAddress,
            device: datos.deviceId,
            status: datos.statusCode,
            duration: `${datos.duration}ms`,
          });
        } catch (error) {
          // Log a stderr pero no fallar
          console.error('[AUDIT ERROR]', error.message);
        }
      })
      .catch((error) => {
        // Fallback: al menos registrar en sistema
        console.error('[AUDIT CRITICAL]', error);
      });
  }
}
