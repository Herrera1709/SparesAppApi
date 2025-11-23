import { SetMetadata } from '@nestjs/common';

/**
 * Decorator para marcar endpoints como públicos (no requieren API Key)
 * Úsalo solo en endpoints que realmente deben ser accesibles sin API Key
 * 
 * Ejemplo:
 * @PublicApi()
 * @Post('register')
 * async register() { ... }
 */
export const IS_PUBLIC_API_KEY = 'isPublicApiKey';
export const PublicApi = () => SetMetadata(IS_PUBLIC_API_KEY, true);

