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

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = this.extractMessage(exceptionResponse);

    this.logger.error(
      `${request.method} ${request.originalUrl} -> ${statusCode} | ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(statusCode).json({
      success: false,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      error: {
        statusCode,
        message,
      },
    });
  }

  private extractMessage(exceptionResponse: string | object | null): string {
    if (!exceptionResponse) {
      return 'Internal server error';
    }

    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    const responseObj = exceptionResponse as { message?: string | string[] };
    if (Array.isArray(responseObj.message)) {
      return responseObj.message.join(', ');
    }

    return responseObj.message ?? 'Unexpected error';
  }
}
