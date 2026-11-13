/** localStorage wrapper that never throws (private mode, file:// quirks) and namespaces keys. */
export function storeGet<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v === null ? fallback : (JSON.parse(v) as T); } catch { return fallback; }
}
export function storeSet(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}
