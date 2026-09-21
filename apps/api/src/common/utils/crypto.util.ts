import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getMasterKey(): Buffer {
  const secret = process.env.JWT_SECRET || 'secureprint-default-master-key-32chars!!';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptJson(data: any): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine IV + Tag + Ciphertext into base64 string
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

export function decryptJson<T = any>(encryptedBase64: string): T | null {
  try {
    const combined = Buffer.from(encryptedBase64, 'base64');
    if (combined.length < IV_LENGTH + TAG_LENGTH) return null;

    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8')) as T;
  } catch {
    return null;
  }
}
