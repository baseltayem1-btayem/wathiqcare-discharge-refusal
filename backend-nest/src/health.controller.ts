import { Controller, Get, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";

import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
    constructor(private readonly healthService: HealthService) { }

    @Get()
    @ApiOperation({ summary: "Combined service health summary" })
    async health(@Res({ passthrough: true }) response: Response) {
        const summary = await this.healthService.summary();
        if (!summary.readiness.ok) {
            response.status(503);
        }
        return summary;
    }

    @Get("live")
    @ApiOperation({ summary: "Liveness check" })
    async live() {
        return this.healthService.live();
    }

    @Get("ready")
    @ApiOperation({ summary: "Readiness check with dependency verification" })
    async ready(@Res({ passthrough: true }) response: Response) {
        const readiness = await this.healthService.ready();
        if (!readiness.ok) {
            response.status(503);
        }
        return readiness;
    }
}