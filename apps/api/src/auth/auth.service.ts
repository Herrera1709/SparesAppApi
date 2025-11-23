import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EmailService } from '../email/email.service';
import { BruteForceGuard } from '../common/security/brute-force.guard';
import { TimingAttackProtection } from '../common/security/timing-attack.guard';
import { SecurityLoggerService, SecurityEventType } from '../common/security/security-logger.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private bruteForceGuard: BruteForceGuard,
    private securityLogger: SecurityLoggerService,
  ) {}

  async register(registerDto: RegisterDto, clientInfo?: { ip?: string; userAgent?: string; timestamp?: Date }) {
    const { email, password, ...rest } = registerDto;
    const identifier = clientInfo?.ip || 'unknown';

    // ============================================
    // SEGURIDAD: Verificar protección brute force
    // ============================================
    await this.bruteForceGuard.checkAttempt(identifier);

    // ============================================
    // SEGURIDAD: Validar fortaleza de contraseña
    // ============================================
    this.validatePasswordStrength(password);

    // Normalizar email
    const normalizedEmail = email.toLowerCase().trim();

    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      await this.bruteForceGuard.recordFailedAttempt(identifier);
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
        email: normalizedEmail,
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
      // ============================================
      // SEGURIDAD: No exponer email en logs
      // ============================================
      this.logger.debug(`[Auth] Enviando email de confirmación`);
      await this.emailService.sendEmailVerificationEmail(
        user.email,
        emailVerificationToken,
        user.firstName || undefined,
        clientInfo
      );
      this.logger.debug(`[Auth] Email de confirmación enviado exitosamente`);
    } catch (error) {
      this.logger.error(`[Auth] Error enviando email de confirmación:`, error);
    }

    // NO devolvemos token de autenticación - el usuario debe verificar su email primero
    return {
      user,
      message: 'Registro exitoso. Por favor, verifica tu correo electrónico para activar tu cuenta.',
    };
  }

  async login(loginDto: LoginDto, clientInfo?: { ip?: string; userAgent?: string; timestamp?: Date }) {
    const { email, password } = loginDto;
    const identifier = clientInfo?.ip || 'unknown';

    // ============================================
    // SEGURIDAD: Verificar protección brute force
    // ============================================
    await this.bruteForceGuard.checkAttempt(identifier);

    // Buscar usuario - INCLUYENDO emailVerified explícitamente
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }, // Normalizar email
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

    // ============================================
    // SEGURIDAD: No revelar si el usuario existe o no
    // ============================================
    if (!user) {
      await this.bruteForceGuard.recordFailedAttempt(identifier);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // ============================================
    // SEGURIDAD: Verificar contraseña con protección contra timing attacks
    // ============================================
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } catch (error) {
      // Si hay error en bcrypt, registrar y lanzar error genérico
      this.securityLogger.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        { ip: identifier, path: '/auth/login', error: 'bcrypt error', email: email.substring(0, 3) + '***' }
      );
      await this.bruteForceGuard.recordFailedAttempt(identifier);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!isPasswordValid) {
      await this.bruteForceGuard.recordFailedAttempt(identifier);
      this.securityLogger.logSecurityEvent(
        SecurityEventType.MULTIPLE_FAILED_LOGINS,
        { ip: identifier, path: '/auth/login', email: email.substring(0, 3) + '***' }
      );
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar que el email esté confirmado
    // Si emailVerified es null o undefined (usuarios antiguos), tratarlo como no verificado
    if (!user.emailVerified || user.emailVerified === null || user.emailVerified === undefined) {
      await this.bruteForceGuard.recordFailedAttempt(identifier);
      throw new UnauthorizedException('Por favor, verifica tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.');
    }

    // ============================================
    // SEGURIDAD: Login exitoso - limpiar intentos
    // ============================================
    await this.bruteForceGuard.recordSuccess(identifier);

    // Generar token
    const token = this.jwtService.sign({ userId: user.id, email: user.email, role: user.role });

    // Enviar email de notificación de login (no bloquea el login si falla)
    try {
      // ============================================
      // SEGURIDAD: No exponer email en logs
      // ============================================
      this.logger.debug(`[Auth] Enviando email de notificación de login`);
      await this.emailService.sendLoginNotificationEmail(
        user.email, 
        user.firstName || undefined, 
        clientInfo
      );
      this.logger.debug(`[Auth] Email de notificación de login enviado exitosamente`);
    } catch (error) {
      this.logger.error(`[Auth] Error enviando email de notificación de login:`, error);
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
      // No usar console.error en producción - usar Logger
      this.logger.error('Error enviando email de reset de contraseña', error);
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
    // ============================================
    // SEGURIDAD: Validar formato del token antes de buscar
    // ============================================
    if (!token || typeof token !== 'string' || token.length !== 64) {
      // Los tokens son hex de 32 bytes = 64 caracteres
      throw new BadRequestException('Token de verificación inválido o expirado');
    }

    // Buscar usuario con el token de verificación válido
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationTokenExpiry: {
          gt: new Date(), // Token no expirado
        },
      },
    });

    // ============================================
    // SEGURIDAD: No revelar si el token existe o no (timing attack protection)
    // ============================================
    if (!user) {
      // Simular tiempo de procesamiento para prevenir timing attacks
      await new Promise(resolve => setTimeout(resolve, 100));
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

  /**
   * Valida la fortaleza de la contraseña
   */
  private validatePasswordStrength(password: string): void {
    if (!password || password.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }

    // Verificar complejidad
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    const complexityScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

    if (complexityScore < 3) {
      throw new BadRequestException(
        'La contraseña debe contener al menos 3 de los siguientes: mayúsculas, minúsculas, números, caracteres especiales'
      );
    }

    // Verificar contraseñas comunes
    const commonPasswords = [
      'password', '12345678', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', '1234567890'
    ];

    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      throw new BadRequestException('La contraseña es demasiado común. Por favor, elige una más segura');
    }
  }
}

