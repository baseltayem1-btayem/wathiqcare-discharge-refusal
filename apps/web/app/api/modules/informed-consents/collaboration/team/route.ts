import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenantId } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";

type TeamBody = {
  departmentName?: string;
  anesthesiologistUserId?: string | null;
  surgeonUserId?: string | null;
  nursingUserId?: string | null;
  legalReviewerUserId?: string | null;
};

const TEAM_ADMIN_ROLES = new Set([
  "tenant_admin",
  "tenant_owner",
  "admin",
  "administrator",
  "medical_director",
  "admin_medical_director",
  "physician_lead",
  "department_head",

  // Pilot phase: allow physician users to configure the clinical collaboration team.
  // This can later be restricted to Department Admin / Medical Director only.
  "physician",
  "doctor",
  "attending_physician",
  "physician_user",
]);

function normalizeDepartmentName(value: string | null | undefined) {
  const text = String(value || "General").trim();
  return text || "General";
}

function nullableId(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function canManageTeam(role: string | undefined) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return TEAM_ADMIN_ROLES.has(normalized);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);
    const prisma = getPrisma();

    const departmentName = normalizeDepartmentName(
      request.nextUrl.searchParams.get("departmentName"),
    );

    const team = await prisma.consentCollaborationTeam.findUnique({
      where: {
        tenantId_departmentName: {
          tenantId,
          departmentName,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      team,
      departmentName,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const tenantId = requireTenantId(auth);

    if (!canManageTeam(auth.role)) {
      return NextResponse.json(
        { ok: false, error: "Only Admin / Department authorized users can assign the collaboration team." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as TeamBody;
    const prisma = getPrisma();

    const departmentName = normalizeDepartmentName(body.departmentName);

    const userIds = [
      nullableId(body.anesthesiologistUserId),
      nullableId(body.surgeonUserId),
      nullableId(body.nursingUserId),
      nullableId(body.legalReviewerUserId),
    ].filter((id): id is string => Boolean(id));

    if (userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          tenantId,
          isActive: true,
        },
        select: { id: true },
      });

      const validIds = new Set(users.map((user) => user.id));
      const invalidIds = userIds.filter((id) => !validIds.has(id));

      if (invalidIds.length > 0) {
        return NextResponse.json(
          { ok: false, error: "One or more selected users are invalid for this tenant." },
          { status: 400 },
        );
      }
    }

    const team = await prisma.consentCollaborationTeam.upsert({
      where: {
        tenantId_departmentName: {
          tenantId,
          departmentName,
        },
      },
      create: {
        tenantId,
        departmentName,
        anesthesiologistUserId: nullableId(body.anesthesiologistUserId),
        surgeonUserId: nullableId(body.surgeonUserId),
        nursingUserId: nullableId(body.nursingUserId),
        legalReviewerUserId: nullableId(body.legalReviewerUserId),
        isActive: true,
      },
      update: {
        anesthesiologistUserId: nullableId(body.anesthesiologistUserId),
        surgeonUserId: nullableId(body.surgeonUserId),
        nursingUserId: nullableId(body.nursingUserId),
        legalReviewerUserId: nullableId(body.legalReviewerUserId),
        isActive: true,
      },
    });

    return NextResponse.json({
      ok: true,
      team,
    });
  } catch (error) {
    return handleApiError(error);
  }
}