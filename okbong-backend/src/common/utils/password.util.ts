import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const ALGORITHM = 'scrypt';

/**
 * Hashes a password with scrypt (Node built-in, therefore no native build step).
 * Format: `scrypt$<salt-hex>$<hash-hex>`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derived = await scrypt(password, salt, KEY_LENGTH);

  return `${ALGORITHM}$${salt}$${derived.toString('hex')}`;
}

/** Constant time verification of a password against a stored hash. */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, hash] = storedHash.split('$');
  if (algorithm !== ALGORITHM || !salt || !hash) return false;

  const expected = Buffer.from(hash, 'hex');
  const actual = await scrypt(password, salt, expected.length || KEY_LENGTH);

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
