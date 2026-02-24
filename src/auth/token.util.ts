import { createHmac, timingSafeEqual } from 'crypto';
import { TokenPayload } from './auth.types';

const DEFAULT_SECRET = 'credsure-dev-secret';
const TTL_SECONDS = 60 * 60 * 12;

const base64UrlEncode = (value: string): string =>
  Buffer.from(value, 'utf8').toString('base64url');

const base64UrlDecode = (value: string): string =>
  Buffer.from(value, 'base64url').toString('utf8');

const sign = (value: string, secret: string): string =>
  createHmac('sha256', secret).update(value).digest('base64url');

export const createToken = (
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
): string => {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + TTL_SECONDS,
  };

  const encodedHeader = base64UrlEncode(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  );
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = sign(
    `${encodedHeader}.${encodedPayload}`,
    process.env.JWT_SECRET ?? DEFAULT_SECRET,
  );

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

export const verifyToken = (token: string): TokenPayload | null => {
  const [encodedHeader, encodedPayload, providedSignature] = token.split('.');

  if (!encodedHeader || !encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(
    `${encodedHeader}.${encodedPayload}`,
    process.env.JWT_SECRET ?? DEFAULT_SECRET,
  );
  const left = Buffer.from(providedSignature);
  const right = Buffer.from(expectedSignature);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp <= now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};
