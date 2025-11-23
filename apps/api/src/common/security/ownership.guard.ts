import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Guard base para verificar ownership de recursos
 * Previene: IDOR (Insecure Direct Object Reference)
 */
@Injectable()
export abstract class OwnershipGuard implements CanActivate {
  abstract canAccess(userId: string, resourceId: string, userRole: string): Promise<boolean>;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;
    const resourceId = request.params.id || request.params.orderId || request.params.paymentId;

    if (!user || !resourceId) {
      throw new ForbiddenException('Acceso denegado');
    }

    const hasAccess = await this.canAccess(user.id, resourceId, user.role);

    if (!hasAccess) {
      // No usar console.warn en producción - usar SecurityLoggerService
      // En producción, esto se loggea a través de SecurityLoggerService
      throw new ForbiddenException('No tienes permiso para acceder a este recurso');
    }

    return true;
  }
}

