import { Readable } from 'node:stream';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { MemberResolver } from './member.resolver';

describe('GraphQL image upload boundaries', () => {
  let directory: string;
  let previous: string;
  const resolver = new MemberResolver({} as any);
  const fakeImage = () =>
    ({
      filename: 'fake.html',
      mimetype: 'image/png',
      createReadStream: () => Readable.from(['<html>not an image</html>']),
    }) as any;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'insu-upload-test-'));
    previous = process.cwd();
    process.chdir(directory);
  });
  afterEach(async () => {
    process.chdir(previous);
    await rm(directory, { recursive: true, force: true });
  });
  it('rejects a traversal destination before opening the input stream', async () => {
    const file = fakeImage();
    file.createReadStream = () => {
      throw new Error('Input stream must not be opened');
    };
    await expect(resolver.imageUploader(file, '../outside')).rejects.toThrow(
      /target|destination/i,
    );
    expect(await readdir(directory)).toEqual([]);
  });
  it('rejects HTML labelled as an allowed image without writing it', async () => {
    await expect(
      resolver.imageUploader(fakeImage(), 'member'),
    ).rejects.toThrow();
    const files = await readdir(directory, { recursive: true });
    expect(files.some((file) => String(file).endsWith('.html'))).toBe(false);
  });
  it('decodes a real image and generates a safe WebP name regardless of the supplied extension', async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    const path = await resolver.imageUploader(
      {
        filename: 'image.html',
        mimetype: 'image/png',
        createReadStream: () => Readable.from([png]),
      } as any,
      'member',
    );
    expect(path).toMatch(/^uploads\/member\/[a-f0-9-]+\.webp$/);
    expect((await sharp(await readFile(path)).metadata()).format).toBe('webp');
  });
  it('cleans up earlier images when a later batch image fails', async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    const valid = {
      filename: 'image.png',
      mimetype: 'image/png',
      createReadStream: () => Readable.from([png]),
    } as any;
    await expect(
      resolver.imagesUploader(
        [Promise.resolve(valid), Promise.resolve(fakeImage())],
        'package',
      ),
    ).rejects.toThrow();
    expect(
      (await readdir(directory, { recursive: true })).filter((path) =>
        String(path).endsWith('.webp'),
      ),
    ).toEqual([]);
  });
  it('rejects an oversized stream before image decoding', async () => {
    const file = {
      filename: 'large.png',
      mimetype: 'image/png',
      createReadStream: () =>
        Readable.from([Buffer.alloc(10 * 1024 * 1024 + 1)]),
    } as any;
    await expect(resolver.imageUploader(file, 'member')).rejects.toThrow(
      /10 MB/,
    );
  });
  it('rejects invalid batch images instead of returning partial success', async () => {
    await expect(
      resolver.imagesUploader([Promise.resolve(fakeImage())], 'community'),
    ).rejects.toThrow();
  });
});
