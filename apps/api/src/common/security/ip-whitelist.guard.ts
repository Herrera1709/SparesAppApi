import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * Guard para whitelist/blacklist de IPs
 * Previene: Acceso desde IPs no autorizadas
 */
@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private whitelist: string[] = [];
  private blacklist: string[] = [];

  constructor(private configService: ConfigService) {
    // Cargar whitelist/blacklist desde variables de entorno
    const whitelistEnv = this.configService.get<string>('IP_WHITELIST');
    const blacklistEnv = this.configService.get<string>('IP_BLACKLIST');

    if (whitelistEnv) {
      this.whitelist = whitelistEnv.split(',').map(ip => ip.trim());
    }

    if (blacklistEnv) {
      this.blacklist = blacklistEnv.split(',').map(ip => ip.trim());
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIp(request);

    // Si hay blacklist y la IP está en ella, bloquear
    if (this.blacklist.length > 0 && this.isIpBlocked(ip)) {
      throw new ForbiddenException('Acceso denegado desde esta IP');
    }

    // Si hay whitelist y la IP no está en ella, bloquear
    if (this.whitelist.length > 0 && !this.isIpAllowed(ip)) {
      throw new ForbiddenException('Acceso denegado desde esta IP');
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

  private isIpBlocked(ip: string): boolean {
    return this.blacklist.some(blockedIp => 
      ip === blockedIp || ip.startsWith(blockedIp.replace('*', ''))
    );
  }

  private isIpAllowed(ip: string): boolean {
    return this.whitelist.some(allowedIp => 
      ip === allowedIp || ip.startsWith(allowedIp.replace('*', ''))
    );
  }
}

