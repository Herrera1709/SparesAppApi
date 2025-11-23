import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';

/**
 * Pipe que valida que los parámetros de ruta sean UUIDs válidos
 * Previene: Path traversal, NoSQL injection, IDOR parcial
 */
@Injectable()
export class ParamValidatorPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // Si el parámetro parece ser un ID (contiene 'id' en el nombre)
    if (metadata.type === 'param' && metadata.data?.toLowerCase().includes('id')) {
      if (!isUUID(value)) {
        throw new BadRequestException(`Parámetro ${metadata.data} debe ser un UUID válido`);
      }

      // Validaciones adicionales de seguridad
      if (value.includes('..') || value.includes('/') || value.includes('\\')) {
        throw new BadRequestException(`Parámetro ${metadata.data} contiene caracteres inválidos`);
      }
    }

    return value;
  }
}

