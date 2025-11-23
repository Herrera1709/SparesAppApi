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

    // Generar token de verificación de email
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationTokenExpiry = new Date();
    emailVerificationTokenExpiry.setHours(emailVerificationTokenExpiry.getHours() + 24); // Expira en 24 horas

    // Crear usuario (sin verificar email)
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        emailVerified: false,
        emailVerificationToken,
        emailVerificationTokenExpiry,
        ...rest,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Enviar email de confirmación (no bloquea el registro si falla)
    try {
      console.log(`[Auth] Enviando email de confirmación a ${user.email}`);
      await this.emailService.sendEmailVerificationEmail(
        user.email,
        emailVerificationToken,
        user.firstName || undefined,
        clientInfo
      );
      console.log(`[Auth] Email de confirmación enviado exitosamente a ${user.email}`);
    } catch (error) {
      console.error(`[Auth] Error enviando email de confirmación a ${user.email}:`, error);
    }

    // NO devolvemos token de autenticación - el usuario debe verificar su email primero
    return {
      user,
      message: 'Registro exitoso. Por favor, verifica tu correo electrónico para activar tu cuenta.',
    };
  }

  async login(loginDto: LoginDto, clientInfo?: { ip?: string; userAgent?: string; timestamp?: Date }) {
    const { email, password } = loginDto;

    // Buscar usuario - INCLUYENDO emailVerified explícitamente
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        emailVerified: true, // IMPORTANTE: Incluir este campo
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar que el email esté confirmado
    // Si emailVerified es null o undefined (usuarios antiguos), tratarlo como no verificado
    if (!user.emailVerified || user.emailVerified === null || user.emailVerified === undefined) {
      throw new UnauthorizedException('Por favor, verifica tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.');
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

  async verifyEmail(token: string) {
    // Buscar usuario con el token de verificación válido
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationTokenExpiry: {
          gt: new Date(), // Token no expirado
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Token de verificación inválido o expirado');
    }

    // Verificar email y limpiar token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      },
    });

    // Generar token de autenticación para que el usuario pueda iniciar sesión automáticamente
    const authToken = this.jwtService.sign({ userId: user.id, email: user.email, role: user.role });

    return {
      message: 'Email verificado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        emailVerified: true,
        createdAt: user.createdAt,
      },
      token: authToken,
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Por seguridad, no revelamos si el email existe o no
    if (!user) {
      return { message: 'Si el email existe, recibirás un correo con instrucciones' };
    }

    // Si ya está verificado, no hacer nada
    if (user.emailVerified) {
      return { message: 'El email ya está verificado' };
    }

    // Generar nuevo token de verificación
    const emailVerificationToken = randomBytes(32).toString('hex');
    const emailVerificationTokenExpiry = new Date();
    emailVerificationTokenExpiry.setHours(emailVerificationTokenExpiry.getHours() + 24); // Expira en 24 horas

    // Actualizar token en la base de datos
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationTokenExpiry,
      },
    });

    // Enviar email
    try {
      await this.emailService.sendEmailVerificationEmail(
        user.email,
        emailVerificationToken,
        user.firstName || undefined,
      );
    } catch (error) {
      console.error('Error enviando email de verificación:', error);
      // No lanzamos error para no revelar información
    }

    return { message: 'Si el email existe, recibirás un correo con instrucciones' };
  }
}

