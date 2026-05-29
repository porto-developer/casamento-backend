import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request, Response } from 'express';
import { REQUEST_ID_KEY } from './request-id.interceptor';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const reqData = request as unknown as Record<string, string>;
    const requestId = reqData[REQUEST_ID_KEY] ?? '-';
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse<Response>();
        const ms = Date.now() - now;
        this.logger.log(
          `${method} ${url} ${response.statusCode} ${ms}ms [${requestId}]`,
        );
      }),
      catchError((err: unknown) => {
        const status =
          err instanceof HttpException ? err.getStatus() : 500;
        const ms = Date.now() - now;
        this.logger.error(
          `${method} ${url} ${status} ${ms}ms [${requestId}]`,
        );
        return throwError(() => err);
      }),
    );
  }
}
