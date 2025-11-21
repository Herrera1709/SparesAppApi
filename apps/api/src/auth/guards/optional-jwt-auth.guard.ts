import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Permite que el request continúe incluso si no hay token
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Llamar al método padre, pero no lanzar error si falla
    return super.canActivate(context) as Observable<boolean>;
  }

  handleRequest(err: any, user: any, info: any) {
    // Si hay error o no hay usuario, simplemente retornar null
    // El endpoint puede funcionar sin autenticación
    if (err || !user) {
      return null;
    }
    return user;
  }
}

