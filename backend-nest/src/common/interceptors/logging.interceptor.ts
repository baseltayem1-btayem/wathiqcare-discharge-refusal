import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
} from "@nestjs/common";
import { Observable, finalize } from "rxjs";
import { randomUUID } from "crypto";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger("HTTP");

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const http = context.switchToHttp();
        const request = http.getRequest<Request & {
            headers: Record<string, string | string[] | undefined>;
            user?: { id?: string; tenantId?: string };
        }>();
        const response = http.getResponse<{
            statusCode: number;
            setHeader: (name: string, value: string) => void;
        }>();

        const start = Date.now();
        const headerRequestId = request.headers?.["x-request-id"];
        const requestId =
            (Array.isArray(headerRequestId) ? headerRequestId[0] : headerRequestId) ||
            randomUUID();
        response.setHeader("x-request-id", requestId);

        return next.handle().pipe(
            finalize(() => {
                const durationMs = Date.now() - start;
                const actorId = request.user?.id || "anonymous";
                const tenantId = request.user?.tenantId || "unknown";
                this.logger.log(
                    JSON.stringify({
                        event: "http_request_completed",
                        requestId,
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
