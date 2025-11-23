import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

/**
 * Interceptor que sanitiza todos los query parameters
 * Previene: NoSQL injection, XSS, Path traversal
 */
@Injectable()
export class QuerySanitizerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.query) {
      // Sanitizar todos los query parameters
      for (const [key, value] of Object.entries(request.query)) {
        if (typeof value === 'string') {
          request.query[key] = this.sanitizeQueryValue(value);
        } else if (Array.isArray(value)) {
          request.query[key] = value.map(v => 
            typeof v === 'string' ? this.sanitizeQueryValue(v) : v
          );
        }
      }
    }

    return next.handle();
  }

  private sanitizeQueryValue(value: string): string {
    // Eliminar caracteres peligrosos
    return value
      .replace(/[<>'"\\]/g, '') // Eliminar caracteres peligrosos
      .replace(/\.\./g, '') // Eliminar path traversal
      .replace(/javascript:/gi, '') // Eliminar protocolos peligrosos
      .replace(/on\w+\s*=/gi, '') // Eliminar event handlers
      .trim()
      .substring(0, 1000); // Limitar longitud
  }
}

