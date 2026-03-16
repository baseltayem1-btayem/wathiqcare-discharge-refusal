import { IsObject, IsOptional, IsString } from "class-validator";

export class ExportReportDto {
    @IsString()
    reportType!: string;

    @IsOptional()
    @IsObject()
    filtersJson?: Record<string, unknown>;
}
