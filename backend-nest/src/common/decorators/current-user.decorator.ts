import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthUser } from "../interfaces/auth-user.interface";

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): AuthUser => {
        const req = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
        return req.user as AuthUser;
    },
);
