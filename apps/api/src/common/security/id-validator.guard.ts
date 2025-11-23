import { Injectable, BadRequestException, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Guard que valida que los IDs en parámetros sean UUIDs válidos
 * Previene: Path traversal, NoSQL injection, IDOR parcial
 */
@Injectable()
export class IdValidatorGuard implements CanActivate {
  private readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const params = request.params;

    // Validar todos los parámetros que parezcan IDs
    for (const [key, value] of Object.entries(params)) {
      if (key.toLowerCase().includes('id') && typeof value === 'string') {
        if (!this.isValidId(value)) {
          throw new BadRequestException(`ID inválido en parámetro ${key}`);
        }
      }
    }

    return true;
  }

  private isValidId(id: string): boolean {
    // Validar UUID
    if (this.UUID_REGEX.test(id)) {
      return true;
    }

    // Rechazar caracteres peligrosos
    if (/[<>'"\\/]/.test(id)) {
      return false;
    }

    // Rechazar paths relativos
    if (id.includes('..') || id.includes('/') || id.includes('\\')) {
      return false;
    }

    return false;
  }
}

