import { Module } from "@nestjs/common";
import { RepresentativesController } from "./representatives.controller";
import { RepresentativesService } from "./representatives.service";

@Module({
    controllers: [RepresentativesController],
    providers: [RepresentativesService],
    exports: [RepresentativesService],
})
export class RepresentativesModule { }
