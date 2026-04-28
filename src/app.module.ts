import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

// Entities
import {
  Colegio,
  Rol,
  Usuario,
  Periodo,
  Materia,
  Desempeno,
  Sede,
  Curso,
  Estudiante,
  CoordinadorSede,
  ProfesorAsignacion,
  Nota,
  Recuperacion,
  CierrePeriodo,
  Auditoria,
  SyncDevice,
  SyncQueue,
  Asistencia,
} from './database/entities';

// Modules
import { AuthModule } from './auth/auth.module';
import { NotasModule } from './notas/notas.module';
import { AsistenciaModule } from './asistencia/asistencia.module';
import { RectorModule } from './rector/rector.module';
import { EstudianteModule } from './estudiante/estudiante.module';

@Module({
  imports: [
    // 🔧 Configuración
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 🗄️ Base de datos PostgreSQL
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'nota_facil_db',
      entities: [
        Colegio,
        Rol,
        Usuario,
        Periodo,
        Materia,
        Desempeno,
        Sede,
        Curso,
        Estudiante,
        CoordinadorSede,
        ProfesorAsignacion,
        Nota,
        Recuperacion,
        CierrePeriodo,
        Auditoria,
        SyncDevice,
        SyncQueue,
        Asistencia,
      ],
      synchronize: process.env.NODE_ENV !== 'production', // ⚠️ Solo en dev
      logging: process.env.NODE_ENV !== 'production', // Logs de SQL en dev
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }),

    // 🔐 JWT
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
      global: true,
    }),

    // 📦 Feature Modules
    AuthModule,
    NotasModule,
    AsistenciaModule,
    RectorModule,
    EstudianteModule,
  ],
})
export class AppModule {}
