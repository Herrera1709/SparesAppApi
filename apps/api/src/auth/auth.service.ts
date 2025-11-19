import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto, clientInfo?: { ip?: string; userAgent?: string; timestamp?: Date }) {
    const { email, password, ...rest } = registerDto;

    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException('El email ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        ...rest,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    // Generar token
    const token = this.jwtService.sign({ userId: user.id, email: user.email, role: user.role });

    // Enviar email de bienvenida (no bloquea el registro si falla)
    try {
      console.log(`[Auth] Enviando email de bienvenida a ${user.email}`);
      await this.emailService.sendWelcomeEmail(user.email, user.firstName || undefined, clientInfo);
      console.log(`[Auth] Email de bienvenida enviado exitosamente a ${user.email}`);
    } catch (error) {
      console.error(`[Auth] Error enviando email de bienvenida a ${user.email}:`, error);
    }

    return {
      user,
      token,
    };
  }

  async login(loginDto: LoginDto, clientInfo?: { ip?: string; userAgent?: string; timestamp?: Date }) {
    const { email, password } = loginDto;

    // Buscar usuario
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar token
    const token = this.jwtService.sign({ userId: user.id, email: user.email, role: user.role });

    // Enviar email de notificación de login (no bloquea el login si falla)
    try {
      console.log(`[Auth] Enviando email de notificación de login a ${user.email}`);
      await this.emailService.sendLoginNotificationEmail(
        user.email, 
        user.firstName || undefined, 
        clientInfo
      );
      console.log(`[Auth] Email de notificación de login enviado exitosamente a ${user.email}`);
    } catch (error) {
      console.error(`[Auth] Error enviando email de notificación de login a ${user.email}:`, error);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Por seguridad, no revelamos si el email existe o no
    if (!user) {
      return { message: 'Si el email existe, recibirás un correo con instrucciones' };
    }

    // Generar token de reset
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Expira en 1 hora

    // Guardar token en la base de datos
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Enviar email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.firstName || undefined,
      );
    } catch (error) {
      console.error('Error enviando email:', error);
      // No lanzamos error para no revelar información
    }

    return { message: 'Si el email existe, recibirás un correo con instrucciones' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    // Buscar usuario con el token válido
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(), // Token no expirado
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Token inválido o expirado');
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizar contraseña y limpiar token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Contraseña restablecida exitosamente' };
  }
}

