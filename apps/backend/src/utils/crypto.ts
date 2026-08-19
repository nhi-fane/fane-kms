import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
// ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters if hex encoded, or 32 raw chars).
// We'll read it from env, and fallback to a deterministic key for local testing if missing, 
// though in production missing key should throw.
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn('WARNING: ENCRYPTION_KEY is not set in .env. Using a fallback key for development ONLY.');
    // Fallback exactly 32 bytes
    return Buffer.from('12345678901234567890123456789012'); 
  }
  
  // If key is provided as hex string
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // If key is a raw 32-character string
  if (key.length === 32) {
    return Buffer.from(key);
  }

  throw new Error('ENCRYPTION_KEY must be exactly 32 characters or 64 hex characters');
};

/**
 * Encrypts a string (e.g. a stringified number)
 * Returns a string in format: iv:authTag:ciphertext
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 12 bytes is standard for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a previously encrypted string
 * Expects format: iv:authTag:ciphertext
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) return '';
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
