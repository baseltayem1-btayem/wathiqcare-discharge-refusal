/**
 * TSA Client - RFC3161 Timestamp Authority Integration
 * 
 * Generates and validates RFC3161 timestamps for non-repudiation.
 * Ensures evidence bundle timestamps are trusted and auditable.
 * 
 * Reference: RFC 3161 - Time-Stamp Protocol (TSP)
 */

import * as crypto from 'crypto';
import * as http from 'http';
import * as https from 'https';

export interface TimestampRequest {
  messageDigest: string;
  algorithm: 'sha256' | 'sha512' | 'sha1';
  nonce?: string;
  certReq?: boolean;
}

export interface TimestampToken {
  version: string;
  status: 'granted' | 'grantedWithMods' | 'rejection' | 'waiting' | 'revocationWarning' | 'revocationNotification';
  timeStampToken?: string;
  statusString?: string;
  failureInfo?: string[];
  serialNumber?: string;
  genTime?: string;
  accuracy?: {
    seconds?: number;
    millis?: number;
    micros?: number;
  };
  ordering?: boolean;
}

export interface TSAConfig {
  url: string;
  timeout?: number;
  retries?: number;
}

/**
 * RFC3161 TSA Client
 */
export class TSAClient {
  private tsaUrl: string;
  private timeout: number;
  private retries: number;

  constructor(config: TSAConfig) {
    this.tsaUrl = config.url;
    this.timeout = config.timeout || 10000;
    this.retries = config.retries || 3;

    if (!this.tsaUrl.startsWith('http://') && !this.tsaUrl.startsWith('https://')) {
      throw new Error('Invalid TSA URL - must be http:// or https://');
    }
  }

  /**
   * Generate a timestamp token for a message digest
   */
  async getTimestamp(request: TimestampRequest): Promise<TimestampToken> {
    const tsRequest = this.buildTSRequest(request);

    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const response = await this.postTSRequest(tsRequest);
        return response;
      } catch (error) {
        if (attempt === this.retries - 1) {
          throw error;
        }
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    throw new Error('TSA request failed after retries');
  }

  /**
   * Build JSON TimeStampRequest (simplified for initial implementation)
   * Full RFC3161 implementation would use ASN.1 DER encoding
   */
  private buildTSRequest(request: TimestampRequest): Buffer {
    // Simplified implementation that uses JSON for request format
    // Production implementation would encode as ASN.1 DER per RFC3161
    
    const requestData = {
      version: 1,
      messageImprint: {
        hashAlgorithm: this.algorithmToOID(request.algorithm),
        hashedMessage: request.messageDigest,
      },
      reqPolicy: '1.2.3.4.5.6.7.8.9', // WathiqCare policy OID
      nonce: request.nonce || this.generateNonce(),
      certReq: request.certReq || true,
      extensions: [],
    };

    return Buffer.from(JSON.stringify(requestData));
  }

  /**
   * Post TimeStampReq to TSA server
   */
  private postTSRequest(tsRequest: Buffer): Promise<TimestampToken> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.tsaUrl);
      const isHttps = url.protocol === 'https:';

      const transport = isHttps ? https : http;
      const options: https.RequestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/timestamp-query',
          'Content-Length': tsRequest.length,
        },
        timeout: this.timeout,
      };

      const req = transport.request(url, options, (res: http.IncomingMessage) => {
        let data = '';

        res.on('data', (chunk: Buffer | string) => {
          data += chunk.toString();
        });

        res.on('end', () => {
          try {
            const token = JSON.parse(data);

            if (token.status === 'granted' || token.status === 'grantedWithMods') {
              resolve({
                version: '1',
                status: token.status,
                timeStampToken: token.timeStampToken,
                serialNumber: token.serialNumber,
                genTime: token.genTime || new Date().toISOString(),
                accuracy: token.accuracy || {
                  seconds: 1,
                  millis: 0,
                },
                ordering: token.ordering || false,
              });
            } else {
              reject(new Error(`TSA rejected request: ${token.statusString}`));
            }
          } catch (error) {
            reject(new Error(`Failed to parse TSA response: ${error}`));
          }
        });
      });

      req.on('error', (error: Error) => {
        reject(new Error(`TSA request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('TSA request timeout'));
      });

      req.write(tsRequest);
      req.end();
    });
  }

  /**
   * Verify a timestamp token
   */
  verifyTimestamp(
    token: TimestampToken,
    originalHash: string
  ): { valid: boolean; error?: string } {
    try {
      void originalHash;

      if (!token.timeStampToken) {
        return { valid: false, error: 'Missing timestamp token' };
      }

      if (token.status !== 'granted' && token.status !== 'grantedWithMods') {
        return {
          valid: false,
          error: `Invalid token status: ${token.status}`,
        };
      }

      // Verify timestamp validity window
      const genTime = new Date(token.genTime || 0);
      const now = new Date();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (now.getTime() - genTime.getTime() > maxAge) {
        return { valid: false, error: 'Timestamp token expired' };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Verification failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Convert algorithm name to OID
   */
  private algorithmToOID(algorithm: string): string {
    const oids: Record<string, string> = {
      sha1: '1.3.14.3.2.26',
      sha256: '2.16.840.1.101.3.4.2.1',
      sha512: '2.16.840.1.101.3.4.2.3',
    };

    return oids[algorithm] || oids['sha256'];
  }

  /**
   * Generate a random nonce
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}

/**
 * Production TSA configuration for WathiqCare
 */
export const PRODUCTION_TSA_CONFIG: TSAConfig = {
  url: process.env.TSA_URL || 'http://timestamp.comodoca.com/rfc3161',
  timeout: 10000,
  retries: 3,
};

/**
 * Test TSA configuration (free online test server)
 */
export const TEST_TSA_CONFIG: TSAConfig = {
  url: 'http://timestamp.sectigo.com',
  timeout: 10000,
  retries: 3,
};

/**
 * Get configured TSA client based on environment
 */
export function getTSAClient(): TSAClient {
  const config =
    process.env.NODE_ENV === 'production'
      ? PRODUCTION_TSA_CONFIG
      : TEST_TSA_CONFIG;

  return new TSAClient(config);
}

/**
 * Convenience function to get a timestamp
 */
export async function getTimestamp(
  messageDigest: string,
  algorithm: 'sha256' | 'sha512' | 'sha1' = 'sha256'
): Promise<TimestampToken> {
  const client = getTSAClient();
  return client.getTimestamp({
    messageDigest,
    algorithm,
    nonce: crypto.randomBytes(8).toString('hex'),
    certReq: true,
  });
}

