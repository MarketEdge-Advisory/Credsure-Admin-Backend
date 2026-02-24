import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

interface WrappedResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, WrappedResponse<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<WrappedResponse<T>> {
    const message = this.getMessage(context);

    return next.handle().pipe(
      map((data) => {
        if (this.isWrappedResponse(data)) {
          return data;
        }

        return {
          status: true,
          message,
          data,
        };
      }),
    );
  }

  private getMessage(context: ExecutionContext): string {
    const customMessage = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (customMessage) {
      return customMessage;
    }

    const request = context.switchToHttp().getRequest<{ method?: string }>();
    const method = request.method?.toUpperCase();

    switch (method) {
      case 'POST':
        return 'Created successfully';
      case 'PATCH':
      case 'PUT':
        return 'Updated successfully';
      case 'DELETE':
        return 'Deleted successfully';
      default:
        return 'Request successful';
    }
  }

  private isWrappedResponse(data: unknown): data is WrappedResponse<T> {
    if (!data || typeof data !== 'object') {
      return false;
    }

    return 'status' in data && 'message' in data && 'data' in data;
  }
}
