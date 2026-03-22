import { NextResponse } from "next/server";
import { sendEmailWithDiagnostics } from "@/lib/server/email-provider";

const TEST_EMAIL_RECIPIENT = "Dolly@linagroups.com";

export async function POST() {
    const startedAt = new Date().toISOString();

    try {
        const diagnostics = await sendEmailWithDiagnostics({
            to: TEST_EMAIL_RECIPIENT,
            subject: "WathiqCare Email Provider Test",
            html: `
                <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
                  <h2>Email Provider Connectivity Test</h2>
                  <p>This is a non-token test email sent from WathiqCare debug endpoint.</p>
                  <p>Timestamp: ${startedAt}</p>
                </div>
            `,
            text: `Email Provider Connectivity Test\nTimestamp: ${startedAt}\nThis is a non-token test email sent from WathiqCare debug endpoint.`,
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
