import { IsString } from "class-validator";

export class TaskCommentDto {
    @IsString()
    comment!: string;
}
