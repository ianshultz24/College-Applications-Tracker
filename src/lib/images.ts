import imageCompression from "browser-image-compression";

/** Logos: <=512px on the long edge, WebP (keeps transparency). */
export function compressLogo(file: File): Promise<File> {
  return imageCompression(file, {
    maxWidthOrHeight: 512,
    fileType: "image/webp",
    initialQuality: 0.9,
    maxSizeMB: 0.5,
    useWebWorker: false, // the worker mode loads a script from a CDN; keep everything local
  });
}

/** Backgrounds: ~2560px on the long edge, WebP at ~0.8. */
export function compressBackground(file: File): Promise<File> {
  return imageCompression(file, {
    maxWidthOrHeight: 2560,
    fileType: "image/webp",
    initialQuality: 0.8,
    maxSizeMB: 4,
    useWebWorker: false, // the worker mode loads a script from a CDN; keep everything local
  });
}

export function isImageFile(file: File | null | undefined): file is File {
  return !!file && /^image\//.test(file.type);
}

/** First image file in a paste/drop payload, if any. */
export function imageFromDataTransfer(data: DataTransfer | null): File | null {
  if (!data) return null;
  for (const item of Array.from(data.items || [])) {
    if (item.kind === "file" && /^image\//.test(item.type)) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  const file = data.files?.[0];
  return isImageFile(file) ? file : null;
}
