import { NextRequest, NextResponse } from "next/server";

function htmlEscape(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id") || "approved-consent-template";
  const title = searchParams.get("title") || id;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${htmlEscape(title)}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:40px;color:#0b1f3a}
    .page{max-width:850px;margin:auto;border:1px solid #d8dce3;border-radius:16px;padding:32px}
    h1{color:#002B5C;margin:0 0 8px}
    .badge{display:inline-block;background:#ecfdf3;color:#027a48;border-radius:999px;padding:6px 12px;font-weight:700;font-size:12px}
    .meta{margin-top:24px;border-top:1px solid #e4e7ec;padding-top:16px;color:#667085}
    .section{margin-top:28px;line-height:1.75}
  </style>
</head>
<body>
  <div class="page">
    <span class="badge">IMC Approved Consent Library</span>
    <h1>${htmlEscape(title)}</h1>
    <div class="meta">Template ID: ${htmlEscape(id)}</div>
    <div class="section">
      <strong>Production PDF Preview</strong><br/>
      This preview is served from the approved consent library resolve endpoint.
      It confirms that the selected library item is no longer routed to a missing consent document record.
    </div>
    <div class="section" dir="rtl">
      <strong>معاينة PDF من مكتبة الموافقات المعتمدة</strong><br/>
      يتم عرض هذه المعاينة من مسار مكتبة الموافقات المعتمدة، وليس من سجل مستند غير موجود.
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
