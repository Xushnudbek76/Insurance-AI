import { IncomingMessage } from 'node:http';

export function corsOrigin(
  origin: string | undefined,
  callback: (error: Error | null, allowed: boolean) => void,
): void {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const developmentDefault =
    process.env.NODE_ENV !== 'production' && allowedOrigins.length === 0;
  callback(
    null,
    origin === undefined ||
      developmentDefault ||
      allowedOrigins.includes(origin),
  );
}

export const socketTransportOptions = {
  cors: { origin: corsOrigin, credentials: true },
  allowRequest: (
    request: IncomingMessage,
    callback: (error: string | null, allowed: boolean) => void,
  ): void => {
    corsOrigin(request.headers.origin, (_error, allowed) => {
      callback(allowed ? null : 'Origin is not allowed', allowed);
    });
  },
};
