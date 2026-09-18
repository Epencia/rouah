import * as SQLite from 'expo-sqlite';
import NetInfo from '@react-native-community/netinfo';

const db = SQLite.openDatabaseSync('rouah_offline.db');

// Init table cache
db.execSync(`
  CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY NOT NULL,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

function cacheKey(url, body) {
  // clé unique par requête
  return `${url}::${JSON.stringify(body || {})}`;
}

export async function isOnline() {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable !== false);
}

function saveCache(key, data) {
  const json = JSON.stringify(data);
  db.runSync(
    'INSERT OR REPLACE INTO cache (key, data, updated_at) VALUES (?, ?, ?)',
    [key, json, Date.now()]
  );
}

function readCache(key) {
  const row = db.getFirstSync('SELECT data FROM cache WHERE key = ?', [key]);
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

/**
 * Remplace tous tes fetch() par ça.
 * - Online  → appelle l'API, sauvegarde le résultat
 * - Offline → renvoie le cache (si existant)
 */
export async function offlineFetch(url, body = {}, options = {}) {
  const key = cacheKey(url, body);
  const online = await isOnline();

  if (online) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        ...options,
      });
      const json = await res.json();

      // Ne cache que les succès
      if (json && json.success !== false) {
        saveCache(key, json);
      }
      return { ...json, _fromCache: false, _online: true };
    } catch (e) {
      // Réseau planté → fallback cache
      const cached = readCache(key);
      if (cached) {
        return { ...cached, _fromCache: true, _online: false };
      }
      throw e;
    }
  }

  // Offline pur
  const cached = readCache(key);
  if (cached) {
    return { ...cached, _fromCache: true, _online: false };
  }
  throw new Error('Hors ligne et aucune donnée en cache');
}