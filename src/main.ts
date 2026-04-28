import { NestFactory } from '@nestjs/core';
import { ValidationPipe, NestApplicationOptions } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🔒 Seguridad
  app.use(helmet()); // Headers de seguridad
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // 🎯 Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 📚 Swagger/OpenAPI para documentación
  const config = new DocumentBuilder()
    .setTitle('NotaFácil Docente - API')
    .setDescription('Plataforma de calificaciones para colegios colombianos')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3001);
  console.log(`🚀 Servidor corriendo en puerto ${process.env.PORT || 3001}`);
}

bootstrap().catch((error) => {
  console.error('❌ Error iniciando servidor:', error);
  process.exit(1);
});
