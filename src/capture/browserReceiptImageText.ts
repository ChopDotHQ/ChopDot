import type {ReceiptFile} from './receiptDraft';

interface DetectedTextBlock {
  rawValue?: string;
}

interface LocalTextDetector {
  detect(source: ImageBitmap): Promise<DetectedTextBlock[]>;
}

type LocalTextDetectorConstructor = new () => LocalTextDetector;

/**
 * Best-effort browser OCR. It never uploads the receipt and never blocks the
 * capture flow: unsupported browsers and detector failures return null so the
 * user receives the original image-first, manually correctable draft.
 */
export async function readReceiptImageTextLocally(file: ReceiptFile): Promise<string | null> {
  if (!(file instanceof Blob) || typeof createImageBitmap !== 'function') return null;
  const Detector = (globalThis as typeof globalThis & {TextDetector?: LocalTextDetectorConstructor}).TextDetector;
  if (!Detector) return null;

  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const blocks = await new Detector().detect(bitmap);
    const text = blocks
      .map(block => block.rawValue?.trim() ?? '')
      .filter(Boolean)
      .join('\n');
    return text || null;
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}
