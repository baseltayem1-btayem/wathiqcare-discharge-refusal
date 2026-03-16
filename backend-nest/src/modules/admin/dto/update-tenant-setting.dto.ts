import { IsNotEmpty, IsObject, IsString } from "class-validator";

export class UpdateTenantSettingDto {
    @IsString()
    @IsNotEmpty()
    configKey!: string;

    @IsObject()
    configValueJson!: Record<string, unknown>;
}
