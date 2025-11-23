import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

interface AttemptRecord {
  count: number;
  lastAttempt: Date;
  blockedUntil?: Date;
}

@Injectable()
export class BruteForceGuard {
  private attempts: Map<string, AttemptRecord> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos
  private readonly RESET_TIME = 60 * 60 * 1000; // 1 hora para resetear contador

  constructor() {
    // Limpiar intentos antiguos cada 10 minutos
    setInterval(() => this.cleanOldAttempts(), 10 * 60 * 1000);
  }

  async checkAttempt(identifier: string): Promise<void> {
    const now = new Date();
    const record = this.attempts.get(identifier);

    // Si está bloqueado, verificar si el bloqueo expiró
    if (record?.blockedUntil && record.blockedUntil > now) {
      const remainingMinutes = Math.ceil((record.blockedUntil.getTime() - now.getTime()) / 60000);
      throw new HttpException(
        `Demasiados intentos fallidos. Intenta nuevamente en ${remainingMinutes} minuto(s).`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Si el bloqueo expiró, resetear
    if (record?.blockedUntil && record.blockedUntil <= now) {
      this.attempts.delete(identifier);
    }
  }

  async recordFailedAttempt(identifier: string): Promise<void> {
    const now = new Date();
    const record = this.attempts.get(identifier) || { count: 0, lastAttempt: now };

    // Si pasó el tiempo de reset, reiniciar contador
    if (now.getTime() - record.lastAttempt.getTime() > this.RESET_TIME) {
      record.count = 0;
    }

    record.count++;
    record.lastAttempt = now;

    // Si excede el máximo, bloquear
    if (record.count >= this.MAX_ATTEMPTS) {
      record.blockedUntil = new Date(now.getTime() + this.BLOCK_DURATION);
      // No usar console.warn en producción - usar Logger o SecurityLoggerService
      // En producción, esto se loggea a través de SecurityLoggerService
    }

    this.attempts.set(identifier, record);
  }

  async recordSuccess(identifier: string): Promise<void> {
    // Limpiar intentos en caso de éxito
    this.attempts.delete(identifier);
  }

  private cleanOldAttempts(): void {
    const now = new Date();
    for (const [key, record] of this.attempts.entries()) {
      // Eliminar registros antiguos sin bloqueo activo
      if (!record.blockedUntil && now.getTime() - record.lastAttempt.getTime() > this.RESET_TIME) {
        this.attempts.delete(key);
      }
      // Eliminar bloqueos expirados
      if (record.blockedUntil && record.blockedUntil <= now) {
        this.attempts.delete(key);
      }
    }
  }

  getRemainingAttempts(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) return this.MAX_ATTEMPTS;
    return Math.max(0, this.MAX_ATTEMPTS - record.count);
  }
}

