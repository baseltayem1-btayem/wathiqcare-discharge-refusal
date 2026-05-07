import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PASSWORD_REQUIREMENTS } from "@/lib/password-policy";

const PASSWORD_HASH_ROUNDS = 12;

/**
 * Validate password against security requirements
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password) {
        errors.push("Password is required");
        return { valid: false, errors };
    }

    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
        errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
    }

    if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push("Password must contain at least one uppercase letter");
    }

    if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
        errors.push("Password must contain at least one lowercase letter");
    }

    if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
        errors.push("Password must contain at least one number");
    }

    if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push("Password must contain at least one special character");
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Hash a password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
        return await bcrypt.compare(password, hash);
    } catch {
        return false;
    }
}

/**
 * Generate a secure reset token
 */
export function generateResetToken(): string {
    return crypto.randomBytes(32).toString("base64url");
}

/**
 * Hash a reset token for storage
 */
export function hashResetToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Check if two password hashes are identical (for preventing password reuse)
 */
export async function isSamePassword(password: string, oldHash: string): Promise<boolean> {
    return verifyPassword(password, oldHash);
}

