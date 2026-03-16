export interface AuthUser {
    id: string;
    tenantId: string;
    email: string;
    isSuperAdmin: boolean;
    roles: string[];
    permissions: string[];
}
