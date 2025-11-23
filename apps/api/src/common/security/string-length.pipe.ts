import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

/**
 * Pipe que valida longitud de strings globalmente
 * Previene: DoS por strings muy largos, buffer overflow
 */
@Injectable()
export class StringLengthPipe implements PipeTransform {
  private readonly MAX_STRING_LENGTH = 10000; // 10KB máximo por string
  private readonly MIN_STRING_LENGTH = 0;

  transform(value: any, metadata: ArgumentMetadata) {
    if (typeof value === 'string') {
      // Validar longitud mínima y máxima
      if (value.length < this.MIN_STRING_LENGTH) {
        throw new BadRequestException(`String demasiado corto (mínimo ${this.MIN_STRING_LENGTH} caracteres)`);
      }

      if (value.length > this.MAX_STRING_LENGTH) {
        throw new BadRequestException(`String demasiado largo (máximo ${this.MAX_STRING_LENGTH} caracteres)`);
      }

      // Validar que no contenga caracteres peligrosos de control
      if (/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(value)) {
        throw new BadRequestException('String contiene caracteres de control no permitidos');
      }
    }

    return value;
  }
}

