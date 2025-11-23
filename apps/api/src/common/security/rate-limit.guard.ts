import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Usar IP real del cliente (considerando proxies)
    const request = req as Request;
    const ip = request.ip || 
               request.connection?.remoteAddress || 
               request.headers['x-forwarded-for']?.toString().split(',')[0] || 
               request.headers['x-real-ip']?.toString() || 
               'unknown';
    
    // Limpiar formato de IPv6
    return ip.replace('::ffff:', '');
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail
  ): Promise<void> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = await this.getTracker(request);
    
    console.warn(`[Security] Rate limit excedido para IP: ${ip} - Ruta: ${request.path}`);
    await super.throwThrottlingException(context, throttlerLimitDetail);
  }
}

