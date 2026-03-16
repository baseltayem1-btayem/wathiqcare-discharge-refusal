export interface JwtPayload {
    sub: string;
    tenantId: string;
    email: string;
    isSuperAdmin: boolean;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
}
