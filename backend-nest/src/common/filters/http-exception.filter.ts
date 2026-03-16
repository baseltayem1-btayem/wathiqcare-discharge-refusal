import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "crypto";

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

    private resolveMessage(status: number, exceptionResponse: unknown): string {
        if (status >= 500) {
            return "Internal server error";
        }

        if (typeof exceptionResponse === "string") {
            return exceptionResponse;
        }

        const responseRecord = exceptionResponse as Record<string, unknown> | null;
        const details = responseRecord?.message;
        if (Array.isArray(details)) {
            return details.join("; ");
        }
        if (typeof details === "string" && details.trim()) {
            return details;
        }

        return "Request failed";
    }

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();
        const requestId =
            (request.headers["x-request-id"] as string | undefined) ||
            randomUUID();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse =
            exception instanceof HttpException ? exception.getResponse() : null;
        const message = this.resolveMessage(status, exceptionResponse);

        const body = {
            success: false,
            error: {
                code: status,
                message,
            },
            path: request.url,
            requestId,
            timestamp: new Date().toISOString(),
        };

        response.setHeader("x-request-id", requestId);

        if (status >= 500) {
            this.logger.error(
                JSON.stringify({
                    event: "http_request_failed",
                    requestId,
                    method: request.method,
                    path: request.url,
                    statusCode: status,
                }),
                exception instanceof Error ? exception.stack : JSON.stringify(exception),
            );
        } else {
            this.logger.warn(
                JSON.stringify({
                    event: "http_request_rejected",
                    requestId,
                    method: request.method,
                    path: request.url,
                    statusCode: status,
                    message,
                }),
            );
        }

        response.status(status).json(body);
    }
}
