import { Controller, Post, Body, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { PublicApi } from '../common/security/public-api.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getClientInfo(req: Request) {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'Desconocida';
    const userAgent = req.headers['user-agent'] || 'Desconocido';
    
    // Limpiar IP (puede venir como "::ffff:192.168.1.1")
    const cleanIp = ip.toString().replace('::ffff:', '');
    
    return {
      ip: cleanIp,
      userAgent,
      timestamp: new Date(),
    };
  }

  @PublicApi() // Permitir acceso sin API Key (necesario para registro)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 intentos por minuto
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const clientInfo = this.getClientInfo(req);
    return this.authService.register(registerDto, clientInfo);
  }

  @PublicApi() // Permitir acceso sin API Key (necesario para login)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 intentos por minuto
  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const clientInfo = this.getClientInfo(req);
    return this.authService.login(loginDto, clientInfo);
  }

  @PublicApi() // Permitir acceso sin API Key
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 intentos por minuto
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @PublicApi() // Permitir acceso sin API Key
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 intentos por minuto
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @PublicApi() // Permitir acceso sin API Key
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 intentos por minuto
  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @PublicApi() // Permitir acceso sin API Key
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 intentos por minuto
  @Post('resend-verification')
  async resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(resendVerificationDto.email);
  }
}

