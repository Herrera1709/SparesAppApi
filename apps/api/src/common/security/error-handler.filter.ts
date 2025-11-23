import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global de excepciones que previene la exposición de información sensible
 * Previene: Information Disclosure, Stack Trace Exposure
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        // Solo incluir detalles en desarrollo
        if (process.env.NODE_ENV !== 'production') {
          details = responseObj.errors || responseObj.details;
        }
      }
    } else if (exception instanceof Error) {
      // ============================================
      // SEGURIDAD: No exponer stack traces en producción
      // ============================================
      this.logger.error(`[Error] ${exception.message}`, exception.stack);
      
      if (process.env.NODE_ENV === 'production') {
        message = 'Error interno del servidor';
      } else {
        message = exception.message;
        details = exception.stack;
      }
    }

    // ============================================
    // SEGURIDAD: Logging de errores sin exponer información sensible
    // ============================================
    this.logger.warn(`[Error] ${request.method} ${request.path} - ${status} - ${message}`, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
    });

    // ============================================
    // SEGURIDAD: Respuesta genérica en producción
    // ============================================
    const errorResponse: any = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Solo incluir detalles en desarrollo
    if (process.env.NODE_ENV !== 'production' && details) {
      errorResponse.details = details;
    }

    response.status(status).json(errorResponse);
  }
}

