import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { config } from 'dotenv';

// Cargar variables de entorno antes de inicializar NestJS (necesario para Prisma)
// Buscar .env en la raíz del workspace (dos niveles arriba desde apps/api)
// También intentar en el directorio actual por si se ejecuta desde la raíz
const rootEnvPath = path.resolve(process.cwd(), '..', '..', '.env');
const currentEnvPath = path.resolve(process.cwd(), '.env');
config({ path: rootEnvPath });
config({ path: currentEnvPath }); // Sobrescribe si existe en el directorio actual

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Habilitar CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') || 'http://localhost:4200',
    credentials: true,
  });

  // Configurar trust proxy para obtener IP real (acceder al Express subyacente)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 API running on: http://localhost:${port}`);
}

bootstrap();

