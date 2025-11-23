import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  email: string;
}

