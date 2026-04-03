from __future__ import annotations

from typing import Iterable

PLATFORM_ROLES = {"platform_superadmin", "platform_admin"}
TENANT_ADMIN_ROLES = {"tenant_owner", "tenant_admin"}
OPERATIONAL_ROLES = {
    "doctor",
    "nursing",
    "reception",
    "patient_affairs",
    "quality",
    "compliance",
    "legal_admin",
    "viewer",
}

ROLE_ALIASES = {
    "platform_superadmin": "platform_superadmin",
    "platform_admin": "platform_admin",
    "tenant_owner": "tenant_owner",
    "owner": "tenant_owner",
    "tenant_admin": "tenant_admin",
    "admin": "tenant_admin",
    "billing": "tenant_admin",
    "doctor": "doctor",
    "nursing": "nursing",
    "nurse": "nursing",
    "reception": "reception",
    "front_desk": "reception",
    "patient_affairs": "patient_affairs",
    "patient_relations": "patient_affairs",
    "social_services": "patient_affairs",
    "quality": "quality",
    "compliance": "compliance",
    "legal_admin": "legal_admin",
    "legal_officer": "legal_admin",
    "viewer": "viewer",
    "member": "viewer",
}


def canonicalize_role(role: str | None) -> str:
    normalized = (role or "").strip().lower()
    return ROLE_ALIASES.get(normalized, normalized or "viewer")


def is_platform_role(role: str | None) -> bool:
    return canonicalize_role(role) in PLATFORM_ROLES


def is_tenant_admin_role(role: str | None) -> bool:
    return canonicalize_role(role) in TENANT_ADMIN_ROLES


def role_allows(role: str | None, allowed_roles: Iterable[str]) -> bool:
    normalized = canonicalize_role(role)
    normalized_allowed = {canonicalize_role(item) for item in allowed_roles}

    if normalized in PLATFORM_ROLES:
        return True

    return normalized in normalized_allowed