import * as argon2 from 'argon2';
import * as crypto from 'crypto';

/**
 * Argon2id password hashing complying with OWASP recommendations:
 * - Type: Argon2id (resistant to GPU and side-channel attacks)
 * - Memory Cost: 64MB (2^16 KB)
 * - Time Cost: 3 iterations
 * - Parallelism: 4 threads
 */
export async function hashPassword(plainText: string): Promise<string> {
  return argon2.hash(plainText, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch {
    return false;
  }
}

/**
 * Cryptographic SHA-256 hash for secure refresh token lookup
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a high-entropy cryptographically secure random token string
 */
export function generateSecureToken(bytes = 40): string {
  return crypto.randomBytes(bytes).toString('hex');
}
