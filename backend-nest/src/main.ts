import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { configureApp } from "./bootstrap";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true,
    });

    const { port, apiPrefix, env } = await configureApp(app);
    await app.listen(port, "0.0.0.0");
    console.log(
        JSON.stringify({
            event: "service_started",
            port,
            apiPrefix,
            env,
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
