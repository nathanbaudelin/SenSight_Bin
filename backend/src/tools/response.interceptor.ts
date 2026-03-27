import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs';
import { ResponseStatusEnum } from './enums';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          (Object.values(ResponseStatusEnum).includes(data.status) ||
            data.message)
        ) {
          return data;
        }

        return {
          status: ResponseStatusEnum.SUCCESS,
          message: 'reply.success',
          data,
        };
      }),
    );
  }
}
