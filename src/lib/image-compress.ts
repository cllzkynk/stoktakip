/**
 * Compress an image file client-side before upload.
 * Resizes to maxWidth x maxHeight and converts to JPEG at specified quality.
 * Returns a base64 data URI string.
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0-1
  } = {}
): Promise<string> {
  const {
    maxWidth = 600,
    maxHeight = 600,
    quality = 0.5,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Scale down proportionally
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context alınamadı'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG at specified quality
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };

    img.onerror = () => reject(new Error('Resim yüklenemedi'));
  });
}

/**
 * Further compress an existing base64 image (for sold products).
 * Reduces to very small size - just enough to recognize the item.
 */
export async function compressImageLow(imageData: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageData;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 200;
      let { width, height } = img;

      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context alınamadı'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.2);
      resolve(dataUrl);
    };

    img.onerror = () => reject(new Error('Resim sıkıştırılamadı'));
  });
}

/**
 * Get approximate size of a base64 data URI in KB
 */
export function getBase64SizeKB(dataUri: string): number {
  // Remove data:image/jpeg;base64, prefix
  const base64 = dataUri.split(',')[1] || '';
  // Base64 uses 4 chars per 3 bytes
  const bytes = (base64.length * 3) / 4;
  return Math.round(bytes / 1024);
}
