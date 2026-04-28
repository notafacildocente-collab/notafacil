import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';

// Entities
import { Usuario, Rol, Colegio, Auditoria } from '../database/entities';

// Services
import { AuthService } from './auth.service';

// Controllers
import { AuthController } from './auth.controller';

// Guards
import { JwtAuthGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';

// Strategies
import { JwtStrategy } from './strategies/jwt.strategy';

// Interceptors
import { AuditInterceptor } from './interceptors/audit.interceptor';

/**
 * AUTH MODULE
 * 
 * Encapsula toda la lógica de autenticación
 * 
 * Exporta:
 * - JwtAuthGuard: Para proteger endpoints
 * - RolesGuard: Para validar roles
 * - CurrentUser: Inyectar usuario en parámetros
 * - Audit decorators: Para auditoría
 * 
 * Uso en otros módulos:
 * @Module({
 *   imports: [AuthModule],
 *   controllers: [...],
 * })
 * export class OtroModule {}
 * 
 * Uso en controladores:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('RECTOR', 'COORDINADOR')
 * @Post('algo')
 * async algoProtegido() { ... }
 */
@Module({
  imports: [
    // 📦 TypeORM: Registrar entities para inyección
    TypeOrmModule.forFeature([Usuario, Rol, Colegio, Auditoria]),

    // 🔐 Passport: Sistema de autenticación
    PassportModule,
  ],

  providers: [
    // 🔑 Service de autenticación
    AuthService,

    // 🛡️ Estrategias Passport
    JwtStrategy,

    // 📍 Guards (hacer disponibles globalmente)
    JwtAuthGuard,
    RolesGuard,

    // 📋 Interceptores (hacer disponibles globalmente)
    AuditInterceptor,
  ],

  controllers: [AuthController],

  // Exportar para que otros módulos los usen
  exports: [AuthService, JwtAuthGuard, RolesGuard, AuditInterceptor],
})
export class AuthModule {}
