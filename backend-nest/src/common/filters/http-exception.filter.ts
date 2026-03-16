import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse =
            exception instanceof HttpException ? exception.getResponse() : null;

        const details =
            typeof exceptionResponse === "string"
                ? exceptionResponse
                : (exceptionResponse as Record<string, unknown>)?.message ||
                "Internal server error";

        const body = {
            success: false,
            error: {
                code: status,
                message: Array.isArray(details) ? details.join("; ") : String(details),
            },
            path: request.url,
            timestamp: new Date().toISOString(),
        };

        if (status >= 500) {
            this.logger.error(
                `${request.method} ${request.url} failed`,
                exception instanceof Error ? exception.stack : JSON.stringify(exception),
            );
        }

        response.status(status).json(body);
    }
}
