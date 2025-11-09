declare module 'qrcode' {
  export function toDataURL(
    text: string,
    options?: {
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
      type?: 'image/png' | 'image/jpeg' | 'image/webp';
      quality?: number;
      margin?: number;
      width?: number;
      color?: {
        dark?: string;
        light?: string;
      };
    }
  ): Promise<string>;

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string,
    options?: unknown
  ): Promise<void>;
}

