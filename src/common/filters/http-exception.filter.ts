import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    let errors: unknown = null;

    if (typeof payload === 'string') {
      message = payload;
    } else if (payload && typeof payload === 'object') {
      const maybeMessage = (payload as { message?: unknown }).message;
      if (typeof maybeMessage === 'string') {
        message = maybeMessage;
      } else if (Array.isArray(maybeMessage)) {
        message = 'Validation failed';
        errors = maybeMessage;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const logMessage = `${request.method} ${request.url} -> ${statusCode} ${message}`;
    const stack = exception instanceof Error ? exception.stack : undefined;

    if (statusCode >= 500) {
      this.logger.error(logMessage, stack);
    } else {
      this.logger.warn(logMessage);
    }

    response.status(statusCode).json({
      status: false,
      message,
      data: null,
      errors,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
