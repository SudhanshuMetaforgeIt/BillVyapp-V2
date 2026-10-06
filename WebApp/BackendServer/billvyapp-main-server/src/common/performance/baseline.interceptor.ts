import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
} from '@nestjs/common';
import { setBaselineRoute } from './baseline';

@Injectable()
export class BaselineInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    setBaselineRoute(context.getClass().name, context.getHandler().name);
    return next.handle();
  }
}
