import { createServer, request } from 'node:http';
import { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { socketTransportOptions } from './cors';

describe('WebSocket handshake origin policy', () => {
  const savedOrigins = process.env.ALLOWED_ORIGINS;
  const savedMode = process.env.NODE_ENV;

  afterEach(() => {
    if (savedOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = savedOrigins;
    if (savedMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = savedMode;
  });

  it.each([
    ['https://unlisted.example', 400],
    ['https://insu.example', 101],
  ])('checks a direct WebSocket connection from %s', async (origin, status) => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = 'https://insu.example';
    const http = createServer();
    const io = new Server(http, socketTransportOptions);
    await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
    try {
      const port = (http.address() as AddressInfo).port;
      const actual = await new Promise<number | undefined>(
        (resolve, reject) => {
          const req = request({
            host: '127.0.0.1',
            port,
            path: '/socket.io/?EIO=4&transport=websocket',
            headers: {
              Origin: origin,
              Connection: 'Upgrade',
              Upgrade: 'websocket',
              'Sec-WebSocket-Version': '13',
              'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
            },
          });
          req.on('error', reject);
          req.on('response', (res) => {
            res.resume();
            resolve(res.statusCode);
          });
          req.on('upgrade', (res, socket) => {
            socket.destroy();
            resolve(res.statusCode);
          });
          req.end();
        },
      );
      expect(actual).toBe(status);
    } finally {
      await new Promise<void>((resolve) => io.close(() => resolve()));
    }
  });
});
