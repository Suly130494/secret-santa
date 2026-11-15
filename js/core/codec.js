/** Caractères sans ambiguïté (pas de I, L, O, 0, 1) pour les codes lisibles. */
export const SAFE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const B64URL = /^[A-Za-z0-9_-]*$/;

/** @param {Uint8Array} bytes @returns {string} */
export function bytesToBase64Url(bytes) {
  let bin = '';
  for (let k = 0; k < bytes.length; k++) bin += String.fromCharCode(bytes[k]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** @param {string} str @returns {Uint8Array} */
export function base64UrlToBytes(str) {
  if (typeof str !== 'string' || !B64URL.test(str) || str.length % 4 === 1) {
    throw new Error('base64url invalide');
  }
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
  return out;
}

/** JSON → UTF-8 → base64url. */
export function encodeJson(value) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

/** base64url → UTF-8 → JSON. Lève une erreur si la chaîne est abîmée. */
export function decodeJson(str) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(str));
  return JSON.parse(text);
}
