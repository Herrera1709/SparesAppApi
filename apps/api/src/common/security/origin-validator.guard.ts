import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SecurityLoggerService, SecurityEventType } from './security-logger.service';

/**
 * Guard que valida el origen (Origin/Referer) de las requests
 * Previene: Acceso desde orígenes no autorizados
 */
@Injectable()
export class OriginValidatorGuard implements CanActivate {
  private readonly allowedOrigins: string[];
  private readonly allowedReferers: string[];
  private readonly strictMode: boolean;

  constructor(
    private configService: ConfigService,
    private securityLogger: SecurityLoggerService,
  ) {
    // Cargar orígenes permitidos desde variables de entorno
    const originsEnv = this.configService.get<string>('ALLOWED_ORIGINS');
    const referersEnv = this.configService.get<string>('ALLOWED_REFERERS');
    
    this.allowedOrigins = originsEnv ? originsEnv.split(',').map(o => o.trim()) : [];
    this.allowedReferers = referersEnv ? referersEnv.split(',').map(r => r.trim()) : [];
    
    // En producción, modo estricto por defecto
    this.strictMode = this.configService.get<string>('STRICT_ORIGIN_VALIDATION') === 'true' || 
                      process.env.NODE_ENV === 'production';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin as string;
    const referer = request.headers.referer as string;
    const ip = this.getClientIp(request);
    const userAgent = request.headers['user-agent'] as string;
    const path = request.path || request.url;
    const method = request.method;

    // ============================================
    // EXCEPCIÓN: Requests OPTIONS (CORS Preflight)
    // ============================================
    // Las requests OPTIONS son preflight de CORS y deben ser permitidas
    // CORS manejará la validación del origen
    if (method === 'OPTIONS') {
      return true;
    }

    // ============================================
    // EXCEPCIÓN: Health Check del ALB de AWS
    // ============================================
    // Permitir requests sin Origin/Referer si:
    // 1. La ruta es /api/health o empieza por /api/health
    // 2. El User-Agent contiene ELB-HealthChecker
    const isHealthEndpoint = path?.includes('/health') || path?.startsWith('/api/health');
    const isHealthChecker = userAgent?.includes('ELB-HealthChecker');
    
    if (isHealthEndpoint || isHealthChecker) {
      // Permitir sin validar Origin/Referer
      // No loguear ni lanzar excepción
      return true;
    }

    // En desarrollo, permitir acceso desde localhost sin validación estricta
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
      // Permitir localhost y 127.0.0.1 en desarrollo
      if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return true;
      }
      if (referer && (referer.includes('localhost') || referer.includes('127.0.0.1'))) {
        return true;
      }
      // Si no hay origin ni referer en desarrollo, también permitir
      if (!origin && !referer) {
        return true;
      }
    }

    // En modo no estricto o desarrollo, permitir requests sin origin/referer
    if (!this.strictMode && !origin && !referer) {
      return true;
    }

    // Validar origin
    if (origin) {
      const isValidOrigin = this.isOriginAllowed(origin);
      if (!isValidOrigin) {
        this.securityLogger.logSecurityEvent(SecurityEventType.ORIGIN_BLOCKED, {
          ip,
          origin,
          path: request.path,
          method: request.method,
        });
        throw new ForbiddenException('Origen no autorizado');
      }
    }

    // Validar referer (si existe y no hay origin)
    if (!origin && referer) {
      const isValidReferer = this.isRefererAllowed(referer);
      if (!isValidReferer) {
        this.securityLogger.logSecurityEvent(SecurityEventType.REFERER_BLOCKED, {
          ip,
          referer,
          path: request.path,
          method: request.method,
        });
        throw new ForbiddenException('Referer no autorizado');
      }
    }

    // En modo estricto, requerir origin o referer
    if (this.strictMode && !origin && !referer) {
      this.securityLogger.logSecurityEvent(SecurityEventType.ORIGIN_MISSING, {
        ip,
        path: request.path,
        method: request.method,
      });
      throw new ForbiddenException('Origin o Referer requerido');
    }

    return true;
  }

  private isOriginAllowed(origin: string): boolean {
    if (this.allowedOrigins.length === 0) {
      // Si no hay orígenes configurados, permitir todos (solo desarrollo)
      return process.env.NODE_ENV !== 'production';
    }

    return this.allowedOrigins.some(allowed => {
      // Soporte para wildcards
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return origin === allowed;
    });
  }

  private isRefererAllowed(referer: string): boolean {
    if (this.allowedReferers.length === 0) {
      return process.env.NODE_ENV !== 'production';
    }

    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;

      return this.allowedReferers.some(allowed => {
        if (allowed.includes('*')) {
          const pattern = allowed.replace(/\*/g, '.*');
          return new RegExp(`^${pattern}$`).test(refererOrigin);
        }
        return refererOrigin === allowed || referer.startsWith(allowed);
      });
    } catch {
      return false;
    }
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

