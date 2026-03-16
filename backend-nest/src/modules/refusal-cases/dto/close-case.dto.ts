import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CloseCaseDto {
    @IsString()
    @IsNotEmpty()
    closureReason!: string;

    @IsOptional()
    @IsString()
    note?: string;
}
