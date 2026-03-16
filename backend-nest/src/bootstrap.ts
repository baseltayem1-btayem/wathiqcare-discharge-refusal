import { INestApplication, ValidationPipe } from "@nestjs/common";
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

    const configService = app.get(ConfigService);
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