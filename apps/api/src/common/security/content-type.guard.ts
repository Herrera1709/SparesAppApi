import { Injectable, CanActivate, ExecutionContext, UnsupportedMediaTypeException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Guard que valida Content-Type de requests
 * Previene: Content-Type confusion attacks
 */
@Injectable()
export class ContentTypeGuard implements CanActivate {
  private readonly ALLOWED_CONTENT_TYPES = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Solo validar para métodos que pueden tener body
    if (!['POST', 'PUT', 'PATCH'].includes(method)) {
      return true;
    }

    const contentType = request.headers['content-type'];

    // Si no hay Content-Type y hay body, rechazar
    if (!contentType && request.body && Object.keys(request.body).length > 0) {
      throw new UnsupportedMediaTypeException('Content-Type es requerido');
    }

    // Si hay Content-Type, validar que sea permitido
    if (contentType) {
      const baseContentType = contentType.split(';')[0].trim();
      const isAllowed = this.ALLOWED_CONTENT_TYPES.some(allowed => 
        baseContentType === allowed || baseContentType.startsWith(allowed)
      );

      if (!isAllowed) {
        throw new UnsupportedMediaTypeException(
          `Content-Type no permitido. Solo se permiten: ${this.ALLOWED_CONTENT_TYPES.join(', ')}`
        );
      }
    }

    return true;
  }
}

