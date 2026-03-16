import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { AuthUser } from "../interfaces/auth-user.interface";

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException("Missing authenticated user context");
        }

        if (user.isSuperAdmin) {
            return true;
        }

        const userPermissions = new Set(user.permissions || []);
        const hasAll = requiredPermissions.every((permission) =>
            userPermissions.has(permission),
        );

        if (!hasAll) {
            throw new ForbiddenException("Insufficient permissions");
        }

        return true;
    }
}
