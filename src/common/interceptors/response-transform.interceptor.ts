import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const page = this.parsePositiveInt(req.query.page);
    const limit = this.parsePositiveInt(req.query.limit);

    return next.handle().pipe(
      map((data) => {
        const base = {
          success: true,
          timestamp: new Date().toISOString(),
          path: req.originalUrl,
        };

        // Servis zaten { items, pagination } donecek sekilde tasarlandiysa normalize et.
        if (
          typeof data === 'object' &&
          data !== null &&
          'items' in data &&
          'pagination' in data &&
          Array.isArray((data as { items: unknown[] }).items)
        ) {
          const payload = data as {
            items: unknown[];
            pagination: { page?: number; limit?: number; total?: number };
          };

          const page = payload.pagination.page ?? 1;
          const limit = payload.pagination.limit ?? payload.items.length;
          const total = payload.pagination.total ?? payload.items.length;
          const totalPages = Math.max(1, Math.ceil(total / (limit || 1)));

          return {
            ...base,
            data: payload.items,
            pagination: {
              page,
              limit,
              total,
              totalPages,
              hasNext: page < totalPages,
              hasPrev: page > 1,
            },
          };
        }

        // Liste endpointlerinde page/limit query gelirse basit pagination uygula.
        if (Array.isArray(data) && page && limit) {
          const total = data.length;
          const totalPages = Math.max(1, Math.ceil(total / limit));
          const safePage = Math.min(page, totalPages);
          const start = (safePage - 1) * limit;
          const items = data.slice(start, start + limit);

          return {
            ...base,
            data: items,
            pagination: {
              page: safePage,
              limit,
              total,
              totalPages,
              hasNext: safePage < totalPages,
              hasPrev: safePage > 1,
            },
          };
        }

        return {
          ...base,
          data,
        };
      }),
    );
  }

  private parsePositiveInt(value: unknown): number | null {
    if (typeof value !== 'string') {
      return null;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return null;
    }

    return parsed;
  }
}
