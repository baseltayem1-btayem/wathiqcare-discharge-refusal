import { IsString } from "class-validator";

export class CreateLegalHoldDto {
    @IsString()
    reason!: string;
}
