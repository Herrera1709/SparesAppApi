import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Utilidad para prevenir timing attacks en comparaciones
 * Previene: Timing attacks en autenticación y validación
 */
@Injectable()
export class TimingAttackProtection {
  /**
   * Compara dos strings de forma segura contra timing attacks
   */
  static secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // Usar crypto.timingSafeEqual requiere buffers del mismo tamaño
      return false;
    }

    try {
      const bufferA = Buffer.from(a, 'utf8');
      const bufferB = Buffer.from(b, 'utf8');
      return crypto.timingSafeEqual(bufferA, bufferB);
    } catch {
      return false;
    }
  }

  /**
   * Compara dos buffers de forma segura
   */
  static secureCompareBuffers(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}

