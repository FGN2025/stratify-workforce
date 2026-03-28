/**
 * AES-256-GCM encryption/decryption for Discord OAuth tokens.
 * Key: 64-char hex string from DISCORD_TOKEN_ENCRYPTION_KEY env var.
 */

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96-bit IV for AES-GCM

function getKeyBytes(): Uint8Array {
  const hex = Deno.env.get("DISCORD_TOKEN_ENCRYPTION_KEY");
  if (!hex || hex.length !== 64) {
    throw new Error("DISCORD_TOKEN_ENCRYPTION_KEY must be a 64-char hex string");
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function importKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    getKeyBytes(),
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypt plaintext → base64 string (iv + ciphertext + tag) */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded,
  );

  // Concatenate IV + ciphertext (which includes the auth tag in WebCrypto)
  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.length);

  // Encode as base64
  return btoa(String.fromCharCode(...combined));
}

/** Decrypt base64 string → plaintext */
export async function decrypt(encoded: string): Promise<string> {
  const key = await importKey();
  const combined = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(plainBuffer);
}
