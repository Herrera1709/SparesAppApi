import { Controller, Post, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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

  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const clientInfo = this.getClientInfo(req);
    return this.authService.register(registerDto, clientInfo);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const clientInfo = this.getClientInfo(req);
    return this.authService.login(loginDto, clientInfo);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}

