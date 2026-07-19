import type { SmsGateway } from "@/lib/server/patient-message-outbox-service";

export type FakeSmsCall = {
  recipient: string;
  message: string;
  idempotencyKey?: string;
};

export function createFakeSmsGateway(options?: {
  failNext?: boolean;
  errorCode?: string;
  errorMessage?: string;
}): SmsGateway & {
  calls: FakeSmsCall[];
  setFailureCount(count: number): void;
  setPermanentFailure(): void;
  reset(): void;
} {
  let failureCount = options?.failNext ? 1 : 0;
  let permanentFailure = false;
  const calls: FakeSmsCall[] = [];

  return {
    calls,
    setFailureCount(count: number) {
      failureCount = count;
    },
    setPermanentFailure() {
      permanentFailure = true;
    },
    reset() {
      calls.length = 0;
      failureCount = 0;
      permanentFailure = false;
    },
    async send(args: { recipient: string; message: string; idempotencyKey?: string }) {
      calls.push({ recipient: args.recipient, message: args.message, idempotencyKey: args.idempotencyKey });
      if (permanentFailure) {
        return {
          ok: false,
          providerMessageId: null,
          errorCode: options?.errorCode || "invalid_recipient",
          errorMessage: options?.errorMessage || "Permanent failure",
        };
      }
      if (failureCount > 0) {
        failureCount -= 1;
        return {
          ok: false,
          providerMessageId: null,
          errorCode: options?.errorCode || "SMS_GATEWAY_UNAVAILABLE",
          errorMessage: options?.errorMessage || "Gateway unavailable",
        };
      }
      return {
        ok: true,
        providerMessageId: `fake-sms-${calls.length}`,
      };
    },
  };
}
