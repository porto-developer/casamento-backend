import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';

export const REQUEST_ID_KEY = 'requestId';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // pino-http atribui req.id via genReqId antes dos interceptors
    const requestId = (request as unknown as Record<string, string>).id;

    (request as unknown as Record<string, string>)[REQUEST_ID_KEY] = requestId;
    response.setHeader('X-Request-Id', requestId);

    return next.handle();
  }
}
