import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard, ThrottlerModuleOptions } from '@nestjs/throttler';
import { APP_GUARD, APP_PIPE, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomThrottlerGuard } from './rate-limit.guard';
import { RequestSizeGuard } from './request-size.guard';
import { ContentTypeGuard } from './content-type.guard';
import { ArrayValidatorPipe } from './array-validator.pipe';
import { StringLengthPipe } from './string-length.pipe';
import { QuerySanitizerInterceptor } from './query-sanitizer.interceptor';
import { ApiKeyGuard } from './api-key.guard';
import { OriginValidatorGuard } from './origin-validator.guard';
import { RequestSignatureGuard } from './request-signature.guard';
import { SecurityLoggerService } from './security-logger.service';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<ThrottlerModuleOptions> => ({
        throttlers: [{
          ttl: 60, // Tiempo en segundos
          limit: config.get<number>('RATE_LIMIT_MAX') || 100, // Requests por TTL
        }],
      }),
    }),
  ],
  providers: [
    Reflector,
    SecurityLoggerService,
    CustomThrottlerGuard,
    RequestSizeGuard,
    ContentTypeGuard,
    ApiKeyGuard,
    OriginValidatorGuard,
    RequestSignatureGuard,
    ArrayValidatorPipe,
    StringLengthPipe,
    QuerySanitizerInterceptor,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RequestSizeGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ContentTypeGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard, // API Key requerida para todas las rutas (excepto las marcadas con @PublicApi())
    },
    {
      provide: APP_GUARD,
      useClass: OriginValidatorGuard, // Validación de origen
    },
    {
      provide: APP_GUARD,
      useClass: RequestSignatureGuard, // Validación de firma de requests
    },
    {
      provide: APP_PIPE,
      useClass: ArrayValidatorPipe,
    },
    {
      provide: APP_PIPE,
      useClass: StringLengthPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: QuerySanitizerInterceptor,
    },
  ],
  exports: [
    RequestSizeGuard,
    ContentTypeGuard,
    ArrayValidatorPipe,
    StringLengthPipe,
    ApiKeyGuard,
    OriginValidatorGuard,
    RequestSignatureGuard,
    SecurityLoggerService,
  ],
})
export class SecurityModule {}

