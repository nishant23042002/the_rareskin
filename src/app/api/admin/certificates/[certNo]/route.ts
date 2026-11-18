import { NextResponse } from "next/server";

import { normaliseCertNo } from "@/lib/certificates";
import {
  certificateActionInput,
  certificateEditInput,
} from "@/lib/validation/certificate";
import { requireAdminRole, SudoRequiredError } from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import {
  issueCertificate,
  revokeCertificate,
  updateCertificateDraft,
} from "@/server/admin";

/**
 * `PATCH /api/admin/certificates/<certNo>` — edit a DRAFT's details. `admin`+.
 * `POST  /api/admin/certificates/<certNo>` — `{ action: "issue", issuedOn, confirmSigned }`
 *   (draft → valid) or `{ action: "revoke", reason }`. `admin`+ and a live `sudo` window.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ certNo: string }> };

const statusFor = (error: string) => (error === "not-found" ? 404 : 422);

export async function PATCH(request: Request, ctxArg: Params) {
  const ctx = await requireAdminRole("admin");
  const certNo = normaliseCertNo(decodeURIComponent((await ctxArg.params).certNo));
  if (!certNo) return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });

  const parsed = certificateEditInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 },
    );
  }

  const req = await requestContext();
  const result = await updateCertificateDraft(certNo, parsed.data, ctx, req);
  if (!result.ok) return NextResponse.json(result, { status: statusFor(result.error) });
  return NextResponse.json(result);
}

export async function POST(request: Request, ctxArg: Params) {
  const ctx = await requireAdminRole("admin");
  const certNo = normaliseCertNo(decodeURIComponent((await ctxArg.params).certNo));
  if (!certNo) return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });

  const parsed = certificateActionInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 },
    );
  }

  const req = await requestContext();
  try {
    const result =
      parsed.data.action === "issue"
        ? await issueCertificate(certNo, parsed.data.issuedOn, ctx, req)
        : await revokeCertificate(certNo, parsed.data.reason, ctx, req);
    if (!result.ok) return NextResponse.json(result, { status: statusFor(result.error) });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SudoRequiredError) {
      return NextResponse.json({ ok: false, error: "sudo-required" }, { status: 409 });
    }
    throw err;
  }
}
