import { timingSafeEqual } from 'crypto';
import * as argon2 from 'argon2';
import { scryptSync } from 'crypto';

export const hashPassword = async (plainPassword: string): Promise<string> => {
  return await argon2.hash(plainPassword);
};

export const verifyPassword = async (
  plainPassword: string,
  storedHash: string,
): Promise<boolean> => {
  if (storedHash.startsWith('$argon2id$')) {
    return argon2.verify(storedHash, plainPassword);
  }

  // Backward compatibility for legacy scrypt hashes in "salt:digest" format.
  const [salt, digest] = storedHash.split(':');
  if (!salt || !digest) {
    return false;
  }

  const currentDigest = scryptSync(plainPassword, salt, 64);
  const savedDigest = Buffer.from(digest, 'hex');
  return (
    currentDigest.length === savedDigest.length &&
    timingSafeEqual(currentDigest, savedDigest)
  );
};
