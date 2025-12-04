// Helper to convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32768
  
  for (let i = 0; i < len; i += chunkSize) {
    // Process in chunks to avoid "Maximum call stack size exceeded"
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    // @ts-ignore
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derives a key from a password using PBKDF2
async function getKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypts data with a password
export async function encryptData(data: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey(password, salt);
  const enc = new TextEncoder();

  const encryptedContent = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    enc.encode(data)
  );

  const encryptedBytes = new Uint8Array(encryptedContent);
  // Combine salt, iv, and encrypted data into one buffer for storage/transmission
  const resultBuffer = new Uint8Array(salt.length + iv.length + encryptedBytes.length);
  resultBuffer.set(salt, 0);
  resultBuffer.set(iv, salt.length);
  resultBuffer.set(encryptedBytes, salt.length + iv.length);

  return bufferToBase64(resultBuffer.buffer);
}

// Decrypts data with a password
export async function decryptData(encryptedData: string, password: string): Promise<string> {
  const encryptedBuffer = base64ToBuffer(encryptedData);
  const encryptedBytes = new Uint8Array(encryptedBuffer);

  const salt = encryptedBytes.slice(0, 16);
  const iv = encryptedBytes.slice(16, 28); // 16 + 12
  const data = encryptedBytes.slice(28);

  const key = await getKey(password, salt);
  const dec = new TextDecoder();
  
  const decryptedContent = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data
  );

  return dec.decode(decryptedContent);
}