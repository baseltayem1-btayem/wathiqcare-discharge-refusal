import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

@Injectable()
export class DocumentStorageService {
    constructor(private readonly configService: ConfigService) { }

    async putObject(input: {
        tenantId: string;
        refusalCaseId: string;
        fileName: string;
        contentBase64?: string;
    }) {
        const key = `${input.tenantId}/${input.refusalCaseId}/${randomUUID()}-${input.fileName}`;
        const size = input.contentBase64
            ? Buffer.from(input.contentBase64, "base64").byteLength
            : 0;

        return {
            storageKey: key,
            persistedSize: size,
        };
    }

    async getDownloadDescriptor(storageKey: string) {
        return {
            downloadUrl: `/api/documents/download/${encodeURIComponent(storageKey)}`,
        };
    }

    async checkConnectivity(): Promise<{ ok: boolean; endpoint: string; error?: string }> {
        const endpoint = this.configService.get<string>("s3.endpoint") || "http://localhost:9000";

        try {
            const response = await fetch(`${endpoint.replace(/\/$/, "")}/minio/health/live`, {
                method: "GET",
                signal: AbortSignal.timeout(3000),
            });

            if (!response.ok) {
                return {
                    ok: false,
                    endpoint,
                    error: `Unexpected MinIO status ${response.status}`,
                };
            }

            return { ok: true, endpoint };
        } catch (error) {
            return {
                ok: false,
                endpoint,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
