export type EncodeFormat = "image/webp" | "image/jpeg";

export async function fileToDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

export function dataURLToImage(dataURL: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = dataURL;
  });
}

export async function loadPica() {
  const mod = await import("pica");
  return mod.default();
}

export function canUseWebP(): boolean {
  try {
    const c = document.createElement("canvas");
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

export interface CropAreaPixels {
  width: number;
  height: number;
  x: number;
  y: number;
}

/**
 * Cắt ảnh theo pixel area (từ react-easy-crop)
 * Trả về canvas đã crop (chưa resize)
 */
export function getCroppedCanvas(
  img: HTMLImageElement,
  crop: CropAreaPixels
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width));
  canvas.height = Math.max(1, Math.round(crop.height));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas;
}

export interface CompressOptions {
  targetMaxDim?: number; // default 512
  targetKB?: number; // default 200
  preferWebP?: boolean; // default true
  qualityStart?: number; // default 0.82
  qualityMin?: number; // default 0.62
  step?: number; // default 0.07
}

/**
 * Resize (pica) -> encode webp/jpeg với vòng lặp giảm chất lượng đến khi ≤ targetKB
 */
export async function resizeAndCompress(
  source: HTMLCanvasElement,
  opts: CompressOptions = {}
): Promise<Blob> {
  const {
    targetMaxDim = 512,
    targetKB = 200,
    preferWebP = true,
    qualityStart = 0.82,
    qualityMin = 0.62,
    step = 0.07,
  } = opts;

  // tạo canvas đích theo max-dim
  const ratio = source.width / source.height;
  const dstW = ratio >= 1 ? targetMaxDim : Math.round(targetMaxDim * ratio);
  const dstH = ratio >= 1 ? Math.round(targetMaxDim / ratio) : targetMaxDim;

  const dst = document.createElement("canvas");
  dst.width = dstW;
  dst.height = dstH;

  // resize bằng pica (chất lượng tốt)
  try {
    const pica = await loadPica();
    await pica.resize(source, dst, { quality: 3 });
  } catch {
    // fallback: drawImage
    const ctx = dst.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, dstW, dstH);
  }

  // chọn định dạng
  const webpOk = preferWebP && canUseWebP();
  const tryFormats: EncodeFormat[] = webpOk
    ? ["image/webp", "image/jpeg"]
    : ["image/jpeg"];

  // lặp giảm quality đến khi đạt size
  for (const fmt of tryFormats) {
    let q = qualityStart;
    while (q >= qualityMin) {
      const blob = await new Promise<Blob | null>((r) =>
        dst.toBlob((b) => r(b), fmt, q)
      );
      if (!blob) break;
      const kb = Math.round(blob.size / 1024);
      if (kb <= targetKB) return blob;
      q -= step;
    }
  }

  // nếu vẫn to quá: trả blob ở qualityMin & format cuối cùng
  const fmt = tryFormats[tryFormats.length - 1];
  const finalBlob = await new Promise<Blob | null>((r) =>
    dst.toBlob((b) => r(b), fmt, qualityMin)
  );
  if (!finalBlob) throw new Error("Encode failed");
  return finalBlob;
}

export function blobToObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}
