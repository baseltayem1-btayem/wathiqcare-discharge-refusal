import type { EmailGateway } from "@/lib/server/patient-message-outbox-service";

export type FakeEmailCall = {
  recipient: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
};

export function createFakeEmailGateway(options?: {
  failNext?: boolean;
  errorCode?: string;
  errorMessage?: string;
}): EmailGateway & {
  calls: FakeEmailCall[];
  setFailureCount(count: number): void;
  reset(): void;
} {
  let failureCount = options?.failNext ? 1 : 0;
  const calls: FakeEmailCall[] = [];

  return {
    calls,
    setFailureCount(count: number) {
      failureCount = count;
    },
    reset() {
      calls.length = 0;
      failureCount = 0;
    },
    async send(args: { recipient: string; subject: string; html: string; text: string; idempotencyKey?: string }) {
      calls.push({ recipient: args.recipient, subject: args.subject, html: args.html, text: args.text, idempotencyKey: args.idempotencyKey });
      if (failureCount > 0) {
        failureCount -= 1;
        return {
          ok: false,
          providerMessageId: null,
          errorCode: options?.errorCode || "EMAIL_GATEWAY_UNAVAILABLE",
          errorMessage: options?.errorMessage || "Email gateway unavailable",
        };
      }
      return {
        ok: true,
        providerMessageId: `fake-email-${calls.length}`,
      };
    },
  };
}
