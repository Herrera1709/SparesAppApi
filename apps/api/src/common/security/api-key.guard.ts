import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SecurityLoggerService, SecurityEventType } from './security-logger.service';
import { IS_PUBLIC_API_KEY } from './public-api.decorator';

/**
 * Guard que valida API Keys para acceso de aplicaciones
 * Previene: Acceso no autorizado desde aplicaciones no registradas
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly validApiKeys: string[];
  private readonly apiKeyHeader = 'X-API-Key';
  private readonly appIdHeader = 'X-App-Id';

  constructor(
    private configService: ConfigService,
    private securityLogger: SecurityLoggerService,
    private reflector: Reflector,
  ) {
    // Cargar API keys desde variables de entorno
    const apiKeysEnv = this.configService.get<string>('API_KEYS');
    if (apiKeysEnv) {
      this.validApiKeys = apiKeysEnv.split(',').map(key => key.trim());
    } else {
      // Si no hay API keys configuradas, generar una por defecto (solo desarrollo)
      this.validApiKeys = process.env.NODE_ENV === 'production' ? [] : ['dev-api-key-default'];
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn('[Security] ⚠️ API_KEYS no configurado en producción. El API estará inaccesible.');
      }
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // ============================================
    // EXCEPCIÓN: Requests OPTIONS (CORS Preflight)
    // ============================================
    // Las requests OPTIONS son preflight de CORS y no requieren API key
    // CORS manejará la validación del origen
    if (method === 'OPTIONS') {
      return true;
    }

    // Verificar si el endpoint está marcado como público
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_API_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si es público, permitir acceso sin API key
    if (isPublic) {
      // En desarrollo, loggear para debugging
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(`[ApiKeyGuard] Endpoint público detectado: ${request.method} ${request.path}`);
      }
      return true;
    }
    const apiKey = request.headers[this.apiKeyHeader.toLowerCase()] as string;
    const appId = request.headers[this.appIdHeader.toLowerCase()] as string;

    // Obtener IP del cliente
    const ip = this.getClientIp(request);

    // En desarrollo, permitir acceso sin API key si no está configurada
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && this.validApiKeys.length === 0) {
      // Si no hay API keys configuradas en desarrollo, permitir acceso
      return true;
    }

    // Si no hay API key, rechazar
    if (!apiKey) {
      this.securityLogger.logSecurityEvent(SecurityEventType.API_KEY_MISSING, {
        ip,
        path: request.path,
        method: request.method,
        userAgent: request.headers['user-agent'],
      });
      throw new UnauthorizedException('API Key requerida. Incluye el header X-API-Key');
    }

    // Validar API key
    if (!this.validApiKeys.includes(apiKey)) {
      this.securityLogger.logSecurityEvent(SecurityEventType.API_KEY_INVALID, {
        ip,
        path: request.path,
        method: request.method,
        userAgent: request.headers['user-agent'],
        providedKey: apiKey.substring(0, 10) + '...', // Solo primeros 10 caracteres para logging
      });
      throw new UnauthorizedException('API Key inválida');
    }

    // Si hay App ID, validarlo también (opcional pero recomendado)
    if (appId) {
      const validAppIds = this.configService.get<string>('APP_IDS')?.split(',').map(id => id.trim()) || [];
      if (validAppIds.length > 0 && !validAppIds.includes(appId)) {
        this.securityLogger.logSecurityEvent(SecurityEventType.APP_ID_INVALID, {
          ip,
          path: request.path,
          method: request.method,
          appId,
        });
        throw new UnauthorizedException('App ID inválido');
      }
    }

    // Log de acceso exitoso (solo en desarrollo o con flag específico)
    if (process.env.LOG_API_ACCESS === 'true') {
      this.securityLogger.logSecurityEvent(SecurityEventType.API_ACCESS_GRANTED, {
        ip,
        path: request.path,
        method: request.method,
        appId: appId || 'unknown',
      });
    }

    return true;
  }

  private getClientIp(request: Request): string {
    const ip = request.ip ||
               request.connection?.remoteAddress ||
               request.headers['x-forwarded-for']?.toString().split(',')[0] ||
               request.headers['x-real-ip']?.toString() ||
               'unknown';
    
    return ip.replace('::ffff:', '');
  }
}

