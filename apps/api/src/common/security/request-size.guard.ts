import { Injectable, CanActivate, ExecutionContext, PayloadTooLargeException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Guard que limita el tamaño de las requests
 * Previene: DoS por payloads grandes
 */
@Injectable()
export class RequestSizeGuard implements CanActivate {
  private readonly MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_HEADER_SIZE = 8192; // 8KB
  private readonly MAX_URL_LENGTH = 2048; // 2KB

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Validar longitud de URL
    if (request.url && request.url.length > this.MAX_URL_LENGTH) {
      throw new PayloadTooLargeException('URL demasiado larga');
    }

    // Validar tamaño de headers
    const headersSize = JSON.stringify(request.headers).length;
    if (headersSize > this.MAX_HEADER_SIZE) {
      throw new PayloadTooLargeException('Headers demasiado grandes');
    }

    // Validar tamaño de body (si existe)
    if (request.body) {
      const bodySize = JSON.stringify(request.body).length;
      if (bodySize > this.MAX_BODY_SIZE) {
        throw new PayloadTooLargeException('Body demasiado grande');
      }
    }

    return true;
  }
}

