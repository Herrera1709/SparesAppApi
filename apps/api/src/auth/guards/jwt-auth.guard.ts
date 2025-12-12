import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }

    // Logs de debugging en desarrollo
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
      const authHeader = request.headers['authorization'];
      console.log(`[JwtAuthGuard] Verificando autenticación para: ${request.method} ${request.path}`);
      console.log(`[JwtAuthGuard] Authorization header:`, authHeader ? `${authHeader.substring(0, 20)}...` : 'NO PRESENTE');
    }

    return super.canActivate(context) as boolean | Promise<boolean>;
  }
}

