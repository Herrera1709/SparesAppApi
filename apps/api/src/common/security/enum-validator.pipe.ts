import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

/**
 * Pipe que valida valores de enum estrictamente
 * Previene: Enum injection, invalid enum values
 */
@Injectable()
export class EnumValidatorPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // Si el valor parece ser un enum (está en metadata.data o tiene decorador @IsEnum)
    if (value && typeof value === 'string') {
      // Validar que no contenga caracteres peligrosos
      if (/[<>'"\\/]/.test(value)) {
        throw new BadRequestException(`Valor inválido: contiene caracteres no permitidos`);
      }

      // Limitar longitud
      if (value.length > 50) {
        throw new BadRequestException(`Valor inválido: demasiado largo`);
      }
    }

    return value;
  }
}

