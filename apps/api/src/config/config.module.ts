import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as path from 'path';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // Buscar .env en la raíz del workspace (dos niveles arriba desde apps/api)
      // También intentar en el directorio actual
      envFilePath: [
        path.resolve(process.cwd(), '..', '..', '.env'),
        path.resolve(process.cwd(), '.env'),
      ],
    }),
  ],
})
export class ConfigModule {}

