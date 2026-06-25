import sharp from 'sharp';
import ApiError from '../../utils/ApiError.js';

const assertImageBuffer = async (buffer) => {
  try {
    const meta = await sharp(buffer, { failOnError: true }).metadata();
    return meta;
  } catch {
    throw new ApiError(400, 'Invalid image file.', { code: 'UPLOAD_IMAGE_INVALID' });
  }
};

const processImage = async ({
  buffer,
  maxWidth = 2048,
  maxHeight = 2048,
  quality = 82,
  format = 'jpeg',
} = {}) => {
  const meta = await assertImageBuffer(buffer);

  const pipeline = sharp(buffer, { failOnError: true, limitInputPixels: 268_435_456 })
    .rotate()
    .resize({
      width: Number(maxWidth) || undefined,
      height: Number(maxHeight) || undefined,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .withMetadata({ orientation: undefined });

  let output;
  let mimeType;
  if (format === 'webp') {
    output = await pipeline.webp({ quality: Number(quality) || 80 }).toBuffer();
    mimeType = 'image/webp';
  } else if (format === 'png') {
    output = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    mimeType = 'image/png';
  } else {
    output = await pipeline.jpeg({ quality: Number(quality) || 82, mozjpeg: true }).toBuffer();
    mimeType = 'image/jpeg';
  }

  const outMeta = await sharp(output).metadata();
  return {
    buffer: output,
    mimeType,
    width: outMeta.width ?? meta.width ?? null,
    height: outMeta.height ?? meta.height ?? null,
    sizeInBytes: output.length,
  };
};

const createThumbnail = async ({ buffer, size = 512, quality = 80, format = 'jpeg' } = {}) =>
  processImage({
    buffer,
    maxWidth: size,
    maxHeight: size,
    quality,
    format,
  });

const imageProcessingService = Object.freeze({
  assertImageBuffer,
  processImage,
  createThumbnail,
});

export default imageProcessingService;

