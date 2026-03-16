import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

function normalizeJsonValue(value: unknown): unknown {
    if (typeof value === "bigint") {
        return value.toString();
    }

    if (Array.isArray(value)) {
        return value.map((item) => normalizeJsonValue(item));
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
                key,
                normalizeJsonValue(nestedValue),
            ]),
        );
    }

    return value;
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
    intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
        return next.handle().pipe(
            map((data) => ({
                success: true,
                data: normalizeJsonValue(data),
            })),
        );
    }
}
