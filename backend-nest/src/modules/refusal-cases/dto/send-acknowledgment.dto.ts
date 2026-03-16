import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
} from "class-validator";

export class SendAcknowledgmentDto {
    @ApiProperty({ enum: ["PATIENT", "REPRESENTATIVE"], example: "PATIENT" })
    @IsEnum(["PATIENT", "REPRESENTATIVE"])
    recipientType!: "PATIENT" | "REPRESENTATIVE";

    @ApiPropertyOptional({ example: "patient-id" })
    @IsOptional()
    @IsString()
    patientId?: string;

    @ApiPropertyOptional({ example: "representative-id" })
    @IsOptional()
    @IsString()
    representativeId?: string;

    @ApiProperty({ example: "Ahmad Saleh" })
    @IsString()
    recipientName!: string;

    @ApiPropertyOptional({ example: "father" })
    @IsOptional()
    @IsString()
    relationshipToPatient?: string;

    @ApiProperty({ enum: ["SMS", "EMAIL", "WHATSAPP", "IN_PERSON"], example: "SMS" })
    @IsEnum(["SMS", "EMAIL", "WHATSAPP", "IN_PERSON"])
    deliveryMethod!: "SMS" | "EMAIL" | "WHATSAPP" | "IN_PERSON";

    @ApiPropertyOptional({ example: "2026-03-17T10:00:00.000Z" })
    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}
