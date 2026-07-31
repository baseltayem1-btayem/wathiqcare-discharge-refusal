declare module "pngjs" {
  export class PNG {
    width: number;
    height: number;
    data: Buffer;
    constructor(options?: { width?: number; height?: number; filterType?: number });
    static sync: {
      read(buffer: Buffer): PNG;
      write(png: PNG): Buffer;
    };
    parse(buffer: Buffer, callback?: (error: Error | null, data: PNG) => void): PNG;
    pack(): NodeJS.WritableStream;
  }
}
