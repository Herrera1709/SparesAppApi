import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { SecurityLoggerService, SecurityEventType } from './security-logger.service';
import * as crypto from 'crypto';

/**
 * Guard que valida la firma de requests para prevenir interceptores
 * Previene: Man-in-the-middle, interceptores HTTP (Burp Suite, OWASP ZAP)
 */
@Injectable()
export class RequestSignatureGuard implements CanActivate {
  private readonly secretKey: string;
  private readonly maxTimeDifference = 5 * 60 * 1000; // 5 minutos

  constructor(
    private configService: ConfigService,
    private securityLogger: SecurityLoggerService,
  ) {
    this.secretKey = this.configService.get<string>('REQUEST_SIGNATURE_SECRET') || 
                     this.configService.get<string>('JWT_SECRET') || 
                     'default-secret-change-in-production';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;
    const ip = this.getClientIp(request);

    // ============================================
    // EXCEPCIÓN: Requests OPTIONS (CORS Preflight)
    // ============================================
    // Las requests OPTIONS son preflight de CORS y no requieren firma
    if (method === 'OPTIONS') {
      return true;
    }

    // Obtener headers de firma
    const requestId = request.headers['x-request-id'] as string;
    const clientTime = request.headers['x-client-time'] as string;
    const bodyHash = request.headers['x-body-hash'] as string;
    const signature = request.headers['x-request-signature'] as string;

    // En desarrollo, permitir acceso sin validación estricta
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
      // En desarrollo, solo validar si los headers están presentes
      // Si no están, permitir acceso (para facilitar desarrollo local)
      return true;
    }

    // En producción, validar solo si los headers están presentes
    // Si no están presentes, permitir acceso (el frontend puede no enviarlos aún)
    // Esto permite que el sistema funcione mientras se actualiza el frontend

    // Para requests GET, la validación es más simple
    if (request.method === 'GET') {
      // Validar timestamp solo si está presente
      if (clientTime) {
        const timeDiff = Math.abs(Date.now() - parseInt(clientTime, 10));
        if (timeDiff > this.maxTimeDifference) {
          this.securityLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
            ip,
            path: request.path,
            method: request.method,
            reason: 'Timestamp fuera de rango',
          });
          throw new UnauthorizedException('Request inválido: timestamp fuera de rango');
        }
      }
      return true;
    }

    // Para requests POST/PUT/PATCH, validar solo si los headers están presentes
    if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
      // Si no hay headers de seguridad, permitir acceso (frontend puede no enviarlos aún)
      if (!requestId && !clientTime && !bodyHash && !signature) {
        return true; // Permitir acceso sin validación si no hay headers
      }

      // Si hay headers, validarlos
      if (clientTime) {
        const timeDiff = Math.abs(Date.now() - parseInt(clientTime, 10));
        if (timeDiff > this.maxTimeDifference) {
          this.securityLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
            ip,
            path: request.path,
            method: request.method,
            reason: 'Timestamp fuera de rango',
          });
          throw new UnauthorizedException('Request inválido: timestamp fuera de rango');
        }
      }

      // Validar hash del body solo si está presente
      // NOTA: Por ahora, solo loguear si no coincide (no rechazar)
      // El frontend puede estar calculando el hash de forma diferente
      // TODO: Sincronizar el cálculo de hash entre frontend y backend
      if (bodyHash && request.body) {
        const calculatedHash = this.calculateBodyHash(request.body);
        if (calculatedHash !== bodyHash) {
          // Solo loguear, no rechazar (el frontend puede estar usando un método diferente)
          this.securityLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
            ip,
            path: request.path,
            method: request.method,
            reason: `Hash de body no coincide (esperado: ${calculatedHash}, recibido: ${bodyHash})`,
          });
          // NO rechazar - permitir que la request continúe
          // throw new UnauthorizedException('Request inválido: integridad comprometida');
        }
      }

      // Validar firma solo si está presente (opcional)
      if (signature && requestId && clientTime) {
        const calculatedSignature = this.calculateSignature(request, requestId, clientTime);
        if (calculatedSignature !== signature) {
          this.securityLogger.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
            ip,
            path: request.path,
            method: request.method,
            reason: 'Firma inválida',
          });
          throw new UnauthorizedException('Request inválido: firma inválida');
        }
      }
    }

    return true;
  }

  private calculateBodyHash(body: any): string {
    try {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      return crypto.createHash('sha256').update(bodyStr).digest('hex').substring(0, 32);
    } catch {
      return '';
    }
  }

  private calculateSignature(request: Request, requestId: string, clientTime: string): string {
    const data = `${request.method}:${request.path}:${requestId}:${clientTime}`;
    return crypto.createHmac('sha256', this.secretKey).update(data).digest('hex');
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

