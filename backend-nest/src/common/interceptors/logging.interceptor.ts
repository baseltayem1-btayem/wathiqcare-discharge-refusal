import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger("HTTP");

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const http = context.switchToHttp();
        const request = http.getRequest<Request & { user?: { id?: string; tenantId?: string } }>();
        const response = http.getResponse<{ statusCode: number }>();

        const start = Date.now();
        return next.handle().pipe(
            tap(() => {
                const durationMs = Date.now() - start;
                const actorId = request.user?.id || "anonymous";
                const tenantId = request.user?.tenantId || "unknown";
                this.logger.log(
                    JSON.stringify({
                        method: (request as any).method,
                        path: (request as any).url,
                        statusCode: response.statusCode,
                        durationMs,
                        actorId,
                        tenantId,
                    }),
                );
            }),
        );
    }
}
