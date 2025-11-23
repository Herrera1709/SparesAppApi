import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { config } from 'dotenv';
import * as helmet from 'helmet';
import { json, urlencoded } from 'express';
import { GlobalExceptionFilter } from './common/security/error-handler.filter';

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

  // ============================================
  // SEGURIDAD: Helmet - Headers de Seguridad
  // ============================================
  app.use(helmet.default({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", configService.get<string>('FRONTEND_URL') || 'http://localhost:4200'],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Deshabilitado para desarrollo
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));

  // ============================================
  // SEGURIDAD: Límites de tamaño de body (más estrictos)
  // ============================================
  app.use(json({ limit: '5mb' })); // Prevenir DoS por payloads grandes (reducido de 10mb a 5mb)
  app.use(urlencoded({ extended: true, limit: '5mb' }));

  // ============================================
  // SEGURIDAD: CORS Configurado de forma segura y estricta
  // ============================================
  const allowedOrigins = configService.get<string>('CORS_ORIGIN')?.split(',') || ['http://localhost:4200'];
  const allowedOriginsStrict = configService.get<string>('ALLOWED_ORIGINS')?.split(',') || allowedOrigins;
  
  app.enableCors({
    origin: (origin, callback) => {
      // En producción, rechazar requests sin origin
      if (!origin && process.env.NODE_ENV === 'production') {
        console.warn(`[Security] CORS bloqueado: request sin origin`);
        return callback(new Error('Origin requerido'));
      }
      
      // Permitir requests sin origin solo en desarrollo
      if (!origin && process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      
      // Validar contra lista de orígenes permitidos
      const isValidOrigin = allowedOriginsStrict.some(allowed => {
        if (allowed.includes('*')) {
          const pattern = allowed.replace(/\*/g, '.*');
          return new RegExp(`^${pattern}$`).test(origin);
        }
        return origin === allowed;
      });
      
      if (isValidOrigin) {
        callback(null, true);
      } else {
        console.warn(`[Security] CORS bloqueado para origen: ${origin}`);
        callback(new Error('No permitido por CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'X-API-Key', 
      'X-App-Id',
      'X-Request-ID',      // Header de seguridad del interceptor
      'X-Client-Time',     // Header de seguridad del interceptor
      'X-Body-Hash',       // Header de seguridad del interceptor
      'Origin',
      'Referer',
      'Cache-Control',     // Header de control de cache del interceptor
      'Pragma',           // Header de control de cache del interceptor
      'Expires'            // Header de control de cache del interceptor
    ],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400, // 24 horas
  });

  // ============================================
  // SEGURIDAD: Trust Proxy para obtener IP real
  // ============================================
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  // ============================================
  // SEGURIDAD: Validación Global Mejorada
  // ============================================
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Eliminar propiedades no definidas en DTOs
      forbidNonWhitelisted: true, // Lanzar error si hay propiedades no permitidas (seguridad)
      transform: true, // Transformar tipos automáticamente
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production', // Ocultar detalles en producción
      exceptionFactory: (errors) => {
        // Personalizar mensajes de error
        const messages = errors.map(err => {
          const constraints = Object.values(err.constraints || {});
          return `${err.property}: ${constraints.join(', ')}`;
        });
        return new BadRequestException({
          message: 'Datos de entrada inválidos',
          errors: messages,
        });
      },
    }),
  );

  // ============================================
  // SEGURIDAD: Ocultar información del servidor
  // ============================================
  app.use((req, res, next) => {
    res.removeHeader('X-Powered-By'); // Ocultar que es Express
    next();
  });

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 API running on: http://localhost:${port}`);
  console.log(`🔒 Security: Helmet, Rate Limiting, CORS, Validation enabled`);
}

bootstrap();

