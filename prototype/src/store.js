/* store.js — profile persistence: db capability → localStorage → paste/import codes.
 *
 * Every capability call is optional. The page must work with no window.claude at all.
 * Public API (window.Store): save, loadAll, exportCode, importCode, clearLocal,
 * saveDraft, loadDraft, clearDraft, lastSaveWhere, dbStatus.
 */
(function () {
  "use strict";

  const LS_PROFILES = "aiwd.profiles";
  const LS_DRAFT = "aiwd.draft";
  const CODE_PREFIX = "AIWD1:";
  const COLLECTION = "profiles";

  // ---------------------------------------------------------------------------
  // db capability (lazy, cached, never throws)
  // ---------------------------------------------------------------------------
  let dbPromise = null;
  function getDb() {
    if (dbPromise) return dbPromise;
    dbPromise = (async () => {
      try {
        if (window.claude && typeof window.claude.use === "function") {
          const db = await window.claude.use("db");
          return db || null;
        }
      } catch (_) { /* not granted, disabled, or no runtime */ }
      return null;
    })();
    return dbPromise;
  }

  // ---------------------------------------------------------------------------
  // localStorage helpers (every read/write wrapped)
  // ---------------------------------------------------------------------------
  function readLocal() {
    try {
      const raw = localStorage.getItem(LS_PROFILES);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(isProfileLike) : [];
    } catch (_) { return []; }
  }
  function writeLocal(arr) {
    try { localStorage.setItem(LS_PROFILES, JSON.stringify(arr)); return true; }
    catch (_) { return false; }
  }
  function isProfileLike(p) {
    return !!(p && typeof p === "object" && typeof p.id === "string" && p.member && p.practice);
  }
  function upsert(arr, profile) {
    const i = arr.findIndex((p) => p.id === profile.id);
    if (i === -1) arr.push(profile); else arr[i] = profile;
    return arr;
  }

  // ---------------------------------------------------------------------------
  // Profiles
  // ---------------------------------------------------------------------------
  const status = { db: "unknown", lastSave: null }; // db: unknown | available | unavailable

  /** Save to db (if possible) and always to localStorage. Returns {where:[...]} */
  async function save(profile) {
    if (!isProfileLike(profile)) throw new Error("Store.save: not a profile");
    const where = [];
    try {
      const db = await getDb();
      if (db) {
        await db.collection(COLLECTION).doc(profile.id).set(profile);
        where.push("db");
        status.db = "available";
      } else {
        status.db = "unavailable";
      }
    } catch (_) {
      // permission, quota, revoked, transient: all ignored; local copy still happens
      status.db = "unavailable";
    }
    if (writeLocal(upsert(readLocal(), profile))) where.push("local");
    status.lastSave = { id: profile.id, where: where.slice() };
    return { where };
  }

  /** Merge db (if readable) + local + imported; dedup by id (db wins, then local). */
  async function loadAll() {
    const out = new Map();
    try {
      const db = await getDb();
      if (db) {
        const snap = await db.collection(COLLECTION).get();
        for (const d of snap.docs || []) {
          const data = d.data && d.data();
          if (isProfileLike(data)) out.set(data.id, data);
        }
        status.db = "available";
      }
    } catch (_) { /* read not permitted or unavailable: treat as empty */ }
    for (const p of readLocal()) if (!out.has(p.id)) out.set(p.id, p);
    return Array.from(out.values()).sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  }

  function clearLocal() {
    try { localStorage.removeItem(LS_PROFILES); } catch (_) { /* ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Export / import codes (the paste bridge when db is unavailable)
  // ---------------------------------------------------------------------------
  // The code is base64 of the JSON (UTF-8 safe) so the member cannot casually read the
  // organiser-only coding (practice level, divergence) on their own feedback screen.
  function encodeB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
  }
  function decodeB64(b64) {
    const bin = atob(b64.replace(/\s+/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function exportCode(profile) {
    return CODE_PREFIX + encodeB64(JSON.stringify(profile));
  }

  /**
   * Parse one or more codes (AIWD1:{...} tokens, a bare JSON object or array, or any mix,
   * one per line or concatenated). Stores each valid profile with source "imported".
   * Returns {imported:[profiles], skipped:number}.
   */
  function parseCodes(text) {
    const found = [];
    const s = String(text || "").trim();
    if (!s) return found;
    // 1. Bare JSON array or object.
    if (!s.includes(CODE_PREFIX)) {
      const v = tryJson(s);
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object") return [v];
    }
    // 2. One or more prefixed codes anywhere in the text. Take the JSON that follows each prefix.
    let idx = s.indexOf(CODE_PREFIX);
    while (idx !== -1) {
      const start = idx + CODE_PREFIX.length;
      const nextIdx = s.indexOf(CODE_PREFIX, start);
      const chunk = (nextIdx === -1 ? s.slice(start) : s.slice(start, nextIdx)).trim();
      let v = tryJson(chunk) || tryJson(chunk.slice(0, chunk.lastIndexOf("}") + 1));
      if (!v) { // base64 form (current); tolerate trailing prose after the code
        const m = chunk.match(/^[A-Za-z0-9+/=]+/);
        if (m) { try { v = tryJson(decodeB64(m[0])); } catch (_) { v = null; } }
      }
      if (Array.isArray(v)) found.push(...v); else if (v) found.push(v);
      idx = nextIdx;
    }
    return found;
  }
  function tryJson(t) {
    try { const v = JSON.parse(t); return (v && typeof v === "object") ? v : null; } catch (_) { return null; }
  }

  function importCode(text) {
    const candidates = parseCodes(text);
    const imported = [];
    let skipped = 0;
    const local = readLocal();
    for (const c of candidates) {
      if (!isProfileLike(c)) { skipped++; continue; }
      const p = Object.assign({}, c, { source: "imported", importedAt: new Date().toISOString() });
      upsert(local, p);
      imported.push(p);
    }
    if (imported.length) writeLocal(local);
    return { imported, skipped };
  }

  // ---------------------------------------------------------------------------
  // Interview draft (resume after reload)
  // ---------------------------------------------------------------------------
  function saveDraft(interviewJSON) {
    try { localStorage.setItem(LS_DRAFT, JSON.stringify({ savedAt: new Date().toISOString(), interview: interviewJSON })); return true; }
    catch (_) { return false; }
  }
  function loadDraft() {
    try {
      const raw = localStorage.getItem(LS_DRAFT);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return (d && d.interview && d.interview.member) ? d : null;
    } catch (_) { return null; }
  }
  function clearDraft() {
    try { localStorage.removeItem(LS_DRAFT); } catch (_) { /* ignore */ }
  }

  window.Store = {
    save, loadAll, exportCode, importCode, clearLocal,
    saveDraft, loadDraft, clearDraft,
    parseCodes, readLocal,
    get status() { return status; },
    KEYS: { profiles: LS_PROFILES, draft: LS_DRAFT, prefix: CODE_PREFIX, collection: COLLECTION },
  };
})();
