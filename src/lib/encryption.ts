/**
 * Simple encryption for API keys using Web Crypto API
 * Keys are encrypted before storage and decrypted only when needed
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

// Derive a key from user's session (ensures keys are user-specific)
async function deriveKey(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(userId.padEnd(32, '0')),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('ai-copywriting-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptAPIKey(apiKey: string, userId: string): Promise<string> {
  const key = await deriveKey(userId);
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    key,
    enc.encode(apiKey)
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

export async function decryptAPIKey(encryptedKey: string, userId: string): Promise<string> {
  try {
    const key = await deriveKey(userId);
    const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      data
    );
    
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt API key');
  }
}
