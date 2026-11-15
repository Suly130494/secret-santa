export const ADMIN_DRAFT_KEY = 'ss-admin-draft';
export const ADMIN_LINKS_KEY = 'ss-admin-links';
export const MUTED_KEY = 'ss-muted';

export const progressKey = (id) => `ss-progress-${id}`;

/** Renvoie `localStorage` s'il est accessible, sinon `null`. */
export function getLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Petit magasin JSON qui ne lève jamais d'exception.
 * Une copie mémoire sert de repli si le stockage du navigateur est bloqué.
 * @param {Storage|null} [backend]
 */
export function createStore(backend = getLocalStorage()) {
  const memory = new Map();
  return {
    get(key) {
      let raw = null;
      let backendOk = false;
      if (backend) {
        try {
          raw = backend.getItem(key);
          backendOk = true;
        } catch { /* stockage bloqué */ }
      }
      if (!backendOk || raw === null) raw = memory.has(key) ? memory.get(key) : null;
      if (raw === null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    set(key, value) {
      const raw = JSON.stringify(value);
      memory.set(key, raw);
      if (backend) {
        try { backend.setItem(key, raw); } catch { /* quota ou mode privé */ }
      }
    },
    remove(key) {
      memory.delete(key);
      if (backend) {
        try { backend.removeItem(key); } catch { /* ignoré */ }
      }
    },
  };
}
