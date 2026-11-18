import { NextResponse } from "next/server";

import { certificateInput } from "@/lib/validation/certificate";
import { requireAdminRole } from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import { createCertificate } from "@/server/admin";

/** `POST /api/admin/certificates` — reserve a number and create a DRAFT. `admin`+. */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireAdminRole("admin");
  const parsed = certificateInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 },
    );
  }

  const req = await requestContext();
  const result = await createCertificate(parsed.data, ctx, req);
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json(result, { status: 201 });
}
