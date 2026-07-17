declare module "wawoff2" {
  export function decompress(buffer: Buffer): Promise<Buffer>;
}
