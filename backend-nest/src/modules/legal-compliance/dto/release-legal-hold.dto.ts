import { IsOptional, IsString } from "class-validator";

export class ReleaseLegalHoldDto {
    @IsOptional()
    @IsString()
    note?: string;
}
