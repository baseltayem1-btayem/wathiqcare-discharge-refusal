import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";

import { AppModule } from "./app.module";
import { configureApp } from "./bootstrap";
import { HealthService } from "./health.service";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
    });

    const { port, apiPrefix, env } = await configureApp(app);

    const configService = app.get(ConfigService);
    const strictReadiness = configService.get<boolean>("startup.strictReadiness") ?? false;
    if (strictReadiness) {
        const healthService = app.get(HealthService);
        const readiness = await healthService.ready();
        if (!readiness.ok) {
            console.error(
                JSON.stringify({
                    event: "startup_readiness_failed",
                    message: "Dependency readiness check failed before startup",
                    checks: readiness.checks,
                }),
            );
            await app.close();
            process.exit(1);
        }
    }

    await app.listen(port, "0.0.0.0");
    console.log(
        JSON.stringify({
            event: "service_started",
            port,
            apiPrefix,
            env,
            strictReadiness,
        }),
    );
}

bootstrap().catch((error: unknown) => {
    console.error(
        JSON.stringify({
            event: "service_start_failed",
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        }),
    );
    process.exit(1);
});
