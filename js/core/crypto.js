import { bytesToBase64Url, base64UrlToBytes } from './codec.js';

export const PBKDF2_ITERATIONS = 120000;

const subtle = () => globalThis.crypto.subtle;

/** Aléa cryptographique dans [0, 1). */
export function cryptoRandom() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
}

/** @param {string} text @returns {Promise<Uint8Array>} */
export async function sha256(text) {
  return new Uint8Array(await subtle().digest('SHA-256', new TextEncoder().encode(text)));
}

async function deriveKey(secret, salt) {
  const base = await subtle().importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Chiffre `data` avec une clé dérivée de `secret` (déjà normalisé par l'appelant).
 * @returns {Promise<{s: string, i: string, c: string}>}
 */
export async function sealVault(data, secret) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(secret, salt);
  const plain = new TextEncoder().encode(JSON.stringify(data));
  const cipher = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, key, plain));
  return { s: bytesToBase64Url(salt), i: bytesToBase64Url(iv), c: bytesToBase64Url(cipher) };
}

/** Déchiffre un coffre. Renvoie `null` sur mauvais secret ou coffre abîmé. */
export async function openVault(vault, secret) {
  try {
    const salt = base64UrlToBytes(vault.s);
    const iv = base64UrlToBytes(vault.i);
    const cipher = base64UrlToBytes(vault.c);
    const key = await deriveKey(secret, salt);
    const plain = await subtle().decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}
