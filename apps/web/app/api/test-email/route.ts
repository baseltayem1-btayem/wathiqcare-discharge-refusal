import { NextResponse } from "next/server";
import {
    buildWathiqCareEmailHtml,
    buildWathiqCareEmailText,
    sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";

const TEST_EMAIL_RECIPIENT = "Dolly@linagroups.com";

export async function POST() {
    const startedAt = new Date().toISOString();

    const html = buildWathiqCareEmailHtml({
        title: "Email Delivery Test",
        preheader: "WathiqCare email delivery is working correctly.",
        bodyHtml: `
            <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">
                This is a test email confirming that the WathiqCare email delivery system
                is configured correctly and working.
            </p>
            <p style="margin:0;font-size:13px;color:#64748b;">Sent at: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${startedAt}</code></p>
        `,
        ctaUrl: "https://wathiqcare.online",
        ctaText: "Go to WathiqCare →",
        securityNote: "This is an automated system test from WathiqCare. No action is required.",
    });

    const text = buildWathiqCareEmailText({
        title: "WathiqCare Email Delivery Test",
        bodyLines: [
            "This is a test email confirming the WathiqCare email delivery system is working.",
            `Sent at: ${startedAt}`,
        ],
        ctaUrl: "https://wathiqcare.online",
        ctaLabel: "WathiqCare Platform",
        securityNote: "This is an automated system test. No action is required.",
    });

    try {
        const diagnostics = await sendEmailWithDiagnostics({
            to: TEST_EMAIL_RECIPIENT,
            subject: "WathiqCare email delivery test",
            html,
            text,
        });

        return NextResponse.json({
            ok: true,
            to: TEST_EMAIL_RECIPIENT,
            startedAt,
            diagnostics,
        });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                to: TEST_EMAIL_RECIPIENT,
                startedAt,
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}

