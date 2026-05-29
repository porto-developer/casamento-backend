import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { REQUEST_ID_KEY } from '../interceptors/request-id.interceptor';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      (request as unknown as Record<string, string>)[REQUEST_ID_KEY] ?? '-';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: Record<string, unknown>;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        body = { ...(exceptionResponse as object), requestId };
      } else {
        body = {
          statusCode: status,
          error: exceptionResponse,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }
    } else {
      if (exception instanceof Error) {
        this.logger.error(exception.message, exception.stack);
      }

      body = {
        statusCode: status,
        error: 'Erro interno do servidor',
        timestamp: new Date().toISOString(),
        requestId,
      };
    }

    response.status(status).json(body);
  }
}
