import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret || jwtSecret === 'secret') {
      throw new Error('JWT_SECRET debe estar configurado en variables de entorno');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Validar expiración
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    // ============================================
    // SEGURIDAD: Validar expiración explícitamente
    // ============================================
    if (!payload || !payload.userId) {
      throw new UnauthorizedException('Token inválido');
    }

    // Verificar expiración manualmente (aunque ignoreExpiration: false ya lo hace)
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Token expirado');
    }

    const user = await this.authService.validateUser(payload.userId);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    return user;
  }
}

