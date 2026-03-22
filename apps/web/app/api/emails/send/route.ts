import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, handleApiError } from "@/lib/server/http";

export const runtime = "nodejs";

interface SendEmailRequest {
    recipients: string[];
    subject: string;
    html_body: string;
    text_body: string;
    cc?: string[];
    attachments?: any[];
}

/**
 * POST /api/emails/send
 * Send email using the configured email provider
 */
export async function POST(request: NextRequest) {
    try {
        // Optional: require authentication for email sending
        // const auth = await requireAuth(request);

        const payload = (await request.json()) as SendEmailRequest;

        if (!payload.recipients || payload.recipients.length === 0) {
            throw new ApiError(400, "recipients are required");
        }

        if (!payload.subject) {
            throw new ApiError(400, "subject is required");
        }

        // Try to send via backend email service (if available)
        const backendUrl = process.env.BACKEND_API_BASE_URL || 'http://localhost:8000';

        try {
            const backendResponse = await fetch(`${backendUrl}/api/emails/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipients: payload.recipients,
                    subject: payload.subject,
                    html_body: payload.html_body,
                    text_body: payload.text_body,
                    cc: payload.cc || [],
                    attachments: payload.attachments || [],
                }),
            });

            if (backendResponse.ok) {
                const backendData = await backendResponse.json();
                return NextResponse.json({
                    success: true,
                    message: 'Email sent successfully',
                    provider: 'backend',
                    ...backendData,
                });
            }
        } catch (error) {
            console.warn('Failed to reach backend email service:', error);
            // Fall through to error response or try alternative provider
        }

        // If backend fails, return error
        throw new ApiError(502, 'Email service unavailable. Please try again later.');

    } catch (error) {
        return handleApiError(error);
    }
}
