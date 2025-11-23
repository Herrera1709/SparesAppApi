import { Injectable } from '@nestjs/common';

export enum SecurityEventType {
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  MULTIPLE_FAILED_LOGINS = 'MULTIPLE_FAILED_LOGINS',
  IDOR_ATTEMPT = 'IDOR_ATTEMPT',
  PATH_TRAVERSAL_ATTEMPT = 'PATH_TRAVERSAL_ATTEMPT',
  INVALID_INPUT = 'INVALID_INPUT',
  API_KEY_MISSING = 'api_key_missing',
  API_KEY_INVALID = 'api_key_invalid',
  APP_ID_INVALID = 'app_id_invalid',
  API_ACCESS_GRANTED = 'api_access_granted',
  ORIGIN_BLOCKED = 'origin_blocked',
  REFERER_BLOCKED = 'referer_blocked',
  ORIGIN_MISSING = 'origin_missing',
}

interface SecurityEvent {
  type: SecurityEventType;
  ip: string;
  userAgent?: string;
  path?: string;
  details?: any;
  timestamp: Date;
}

@Injectable()
export class SecurityLoggerService {
  private events: SecurityEvent[] = [];
  private readonly MAX_EVENTS = 1000; // Mantener últimos 1000 eventos en memoria

  logSecurityEvent(
    type: SecurityEventType,
    details: {
      ip: string;
      userAgent?: string;
      path?: string;
      userId?: string;
      email?: string;
      method?: string;
      [key: string]: any;
    },
  ): void {
    const event: SecurityEvent = {
      type,
      ip: details.ip,
      userAgent: details.userAgent,
      path: details.path,
      details: { ...details },
      timestamp: new Date(),
    };

    this.events.push(event);

    // Mantener solo los últimos MAX_EVENTS
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    // Log a consola con formato estructurado
    console.warn(`[SECURITY] ${type}`, {
      ip: details.ip,
      timestamp: event.timestamp.toISOString(),
      ...details,
    });

    // En producción, aquí podrías enviar a un servicio de logging externo
    // como Sentry, LogRocket, CloudWatch, etc.
  }

  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  getEventsByType(type: SecurityEventType, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter((e) => e.type === type)
      .slice(-limit);
  }

  getEventsByIp(ip: string, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter((e) => e.ip === ip)
      .slice(-limit);
  }
}

