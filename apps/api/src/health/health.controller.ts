import { Controller, Get } from '@nestjs/common';
import { PublicApi } from '../common/security/public-api.decorator';

@Controller('health')
@PublicApi() // Marcar todo el controlador como público (sin API Key)
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    };
  }

  @Get('ping')
  ping() {
    return {
      message: 'pong',
      timestamp: new Date().toISOString(),
    };
  }
}

