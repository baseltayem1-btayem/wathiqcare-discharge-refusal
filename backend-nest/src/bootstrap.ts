import { INestApplication, Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import compression from "compression";

import { GlobalHttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor";
import { PrismaService } from "./prisma/prisma.service";

type ConfigureAppOptions = {
    enableShutdownHooks?: boolean;
};

export async function configureApp(
    app: INestApplication,
    options: ConfigureAppOptions = {},
) {
    app.use(helmet());
    app.use(compression());
    const configService = app.get(ConfigService);
    const env = configService.get<string>("env") || "development";
    const logger = new Logger("Bootstrap");

    const corsAllowedOrigins = configService.get<string[]>("corsAllowedOrigins") || [];
    if (env !== "production") {
        // Development: allow all origins to enable local tooling, Swagger UI, etc.
        app.enableCors({
            origin: true,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
            credentials: true,
        });
        logger.warn("CORS policy: open (all origins) — development mode only");
    } else if (corsAllowedOrigins.length > 0) {
        app.enableCors({
            origin: corsAllowedOrigins,
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
            credentials: true,
        });
        logger.log(`CORS policy: restricted to ${corsAllowedOrigins.join(", ")}`);
    } else {
        // Production without explicit origins: disable CORS (backend behind proxy only).
        logger.log("CORS policy: disabled (backend is accessed only via internal proxy)");
    }


    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseEnvelopeInterceptor());

    const apiPrefix = configService.get<string>("apiPrefix") || "api";
    app.setGlobalPrefix(apiPrefix);

    const swaggerConfig = new DocumentBuilder()
        .setTitle("WathiqCare Backend API")
        .setDescription("Modular monolith API for refusal of discharge case management")
        .setVersion("1.0.0")
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

    if (options.enableShutdownHooks !== false) {
        const prismaService = app.get(PrismaService);
        await prismaService.enableShutdownHooks(app);
    }

    return {
        port: configService.get<number>("port") || 4000,
        apiPrefix,
        env: configService.get<string>("env") || "development",
    };
}