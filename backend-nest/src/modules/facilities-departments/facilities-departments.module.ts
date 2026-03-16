import { Module } from "@nestjs/common";
import { FacilitiesDepartmentsController } from "./facilities-departments.controller";
import { FacilitiesDepartmentsService } from "./facilities-departments.service";

@Module({
    controllers: [FacilitiesDepartmentsController],
    providers: [FacilitiesDepartmentsService],
    exports: [FacilitiesDepartmentsService],
})
export class FacilitiesDepartmentsModule { }
