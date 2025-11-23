import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

/**
 * Pipe que valida y limita arrays
 * Previene: DoS por arrays grandes, mass assignment
 */
@Injectable()
export class ArrayValidatorPipe implements PipeTransform {
  private readonly MAX_ARRAY_LENGTH = 100;
  private readonly MAX_STRING_LENGTH = 1000;

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type === 'body' && value && typeof value === 'object') {
      // Validar todos los arrays en el body
      for (const [key, val] of Object.entries(value)) {
        if (Array.isArray(val)) {
          // Limitar longitud de array
          if (val.length > this.MAX_ARRAY_LENGTH) {
            throw new BadRequestException(
              `El array '${key}' no puede tener más de ${this.MAX_ARRAY_LENGTH} elementos`
            );
          }

          // Validar elementos del array
          val.forEach((item, index) => {
            if (typeof item === 'string' && item.length > this.MAX_STRING_LENGTH) {
              throw new BadRequestException(
                `El elemento ${index} del array '${key}' excede el límite de ${this.MAX_STRING_LENGTH} caracteres`
              );
            }
          });
        }
      }
    }

    return value;
  }
}

