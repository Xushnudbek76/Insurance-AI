import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, realpath, writeFile, unlink } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import sharp from 'sharp';
import type { FileUpload } from 'graphql-upload';

const targets = new Set(['member', 'package', 'community']);
const allowedFormats: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};
const maxBytes = 10 * 1024 * 1024;

export async function saveImage(
  file: FileUpload,
  target: string,
): Promise<string> {
  if (!targets.has(target))
    throw new BadRequestException('Invalid upload target');
  const stream = file.createReadStream();
  const chunks: Buffer[] = [];
  let length = 0;
  try {
    for await (const chunk of stream) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      length += bytes.length;
      if (length > maxBytes)
        throw new BadRequestException('Image must be at most 10 MB');
      chunks.push(bytes);
    }
    const decoder = sharp(Buffer.concat(chunks), {
      limitInputPixels: 16_000_000,
      failOn: 'warning',
    });
    const metadata = await decoder.metadata();
    if (!metadata.format || allowedFormats[metadata.format] !== file.mimetype)
      throw new Error('Unsupported image');
    const image = await decoder
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    const root = resolve('uploads');
    await mkdir(root, { recursive: true });
    const directory = resolve(root, target);
    await mkdir(directory, { recursive: true });
    const actualRoot = await realpath(root);
    const actualDirectory = await realpath(directory);
    if (!actualDirectory.startsWith(actualRoot + sep))
      throw new BadRequestException('Invalid upload destination');
    const name = `${randomUUID()}.webp`;
    await writeFile(resolve(actualDirectory, name), image, {
      flag: 'wx',
      mode: 0o644,
    });
    return `uploads/${target}/${name}`;
  } catch (error) {
    stream.destroy();
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException(
      'Provide a valid PNG, JPEG, WebP or GIF image',
    );
  }
}

export async function saveImages(
  files: Promise<FileUpload>[],
  target: string,
): Promise<string[]> {
  if (!targets.has(target))
    throw new BadRequestException('Invalid upload target');
  if (!files.length || files.length > 10)
    throw new BadRequestException('Upload between 1 and 10 images');
  const results: string[] = [];
  try {
    // Await all upload descriptors first so rejected uploads cannot be unhandled.
    const uploads = await Promise.all(files);
    for (const file of uploads) results.push(await saveImage(file, target));
    return results;
  } catch (error) {
    await Promise.all(
      results.map((path) => unlink(resolve(path)).catch(() => undefined)),
    );
    throw error;
  }
}
