import bcrypt from "bcryptjs";

/**
 * Minimum cost/work factor of 12 as defined by Phase 1 security specifications (docs/SECURITY.md).
 */
export const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcryptjs with at least 12 salt rounds.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  if (!plaintext || typeof plaintext !== "string") {
    throw new Error("Invalid password input for hashing");
  }
  return bcrypt.hash(plaintext, BCRYPT_SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against an existing bcrypt hash.
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  if (!plaintext || !hash || typeof plaintext !== "string" || typeof hash !== "string") {
    return false;
  }
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch {
    return false;
  }
}
