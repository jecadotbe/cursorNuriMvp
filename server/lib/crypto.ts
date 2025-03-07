import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Crypto utility for password hashing and verification
 */
export const crypto = {
  /**
   * Hash a password with a random salt
   * @param password The password to hash
   * @returns A string in the format "hashedPassword.salt"
   */
  hash: async (password: string): Promise<string> => {
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  },
  
  /**
   * Compare a password with a stored hash
   * @param suppliedPassword The password to check
   * @param storedPassword The stored password hash
   * @returns True if the password matches, false otherwise
   */
  compare: async (suppliedPassword: string, storedPassword: string): Promise<boolean> => {
    const [hashedPassword, salt] = storedPassword.split('.');
    const hashedPasswordBuf = Buffer.from(hashedPassword, 'hex');
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
  
  /**
   * Generate a random token
   * @param length The length of the token in bytes (default: 32)
   * @returns A random token as a hex string
   */
  generateToken: (length = 32): string => {
    return randomBytes(length).toString('hex');
  }
}; 