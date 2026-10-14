"use client";

/* Mounts the prototype's vanilla organiser and share-back views (public/legacy/*.js) unchanged in
 * look and behaviour. Before the scripts load, this sets the globals they expect from the typed
 * lib/aiwd ports (Prompts, Engine, SEED), plus App.ui helpers and a Store shim over the organiser API. */

import { useEffect, useRef, useState } from "react";
import * as Aiwd from "@/lib/aiwd";

type View = "organiser" | "network";

interface LegacyView {
  render: (container: HTMLElement, opts?: unknown) => Promise<unknown>;
  closeDetail?: () => void;
}
interface LegacyWindow {
  Prompts?: unknown;
  Engine?: unknown;
  SEED?: unknown;
  Store?: unknown;
  App?: unknown;
  OrganiserView?: LegacyView;
  NetworkView?: LegacyView;
}
const W = () => window as unknown as LegacyWindow;

// --- App.ui helpers (same behaviour as prototype/src/index.html) -------------------------------
function el(tag: string, attrs?: Record<string, unknown> | null, children?: unknown): HTMLElement {
  const node = document.createElement(tag);
  for (const k of Object.keys(attrs || {})) {
    const v = (attrs as Record<string, unknown>)[k];
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") node.className = String(v);
    else if (k === "on") for (const ev of Object.keys(v as object)) node.addEventListener(ev, (v as Record<string, EventListener>)[ev]);
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k === "dataset") Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  const kids = Array.isArray(children) ? children : children === undefined ? [] : [children];
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : (c as Node));
  }
  return node;
}
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function toast(msg: string) {
  let t = document.getElementById("toast");
  if (!t) {
    t = el("div", { id: "toast", role: "status" });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (t) t.hidden = true;
  }, 3000);
}
function copy(text: string, btn?: HTMLElement) {
  const done = () => {
    if (btn) {
      const old = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(() => {
        btn.textContent = old;
      }, 2000);
    }
    toast("Copied to clipboard");
  };
  const fallback = () => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.readOnly = true;
      Object.assign(ta.style, { position: "fixed", opacity: "0", left: "0", top: "0" });
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand && document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) done();
      else toast("Copy failed. Select the text and copy it by hand.");
    } catch {
      toast("Copy failed. Select the text and copy it by hand.");
    }
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  } catch {
    fallback();
  }
}

// --- Store shim over the organiser API ---------------------------------------------------------
async function json<T>(r: Response): Promise<T> {
  if (r.status === 401) {
    window.location.href = "/organiser/login";
    throw new Error("Your organiser session has ended; sign in again.");
  }
  if (!r.ok) {
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || `request failed (${r.status})`);
  }
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}
const Store = {
  async loadAll() {
    const j = await json<{ profiles: unknown[] }>(await fetch("/api/organiser/profiles", { cache: "no-store" }));
    return Array.isArray(j.profiles) ? j.profiles : [];
  },
  async importCode(text: string) {
    return json<{ imported: number; skipped: number }>(
      await fetch("/api/organiser/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }),
    );
  },
  async deleteProfile(id: string) {
    await json<void>(await fetch("/api/organiser/profiles/" + encodeURIComponent(id), { method: "DELETE" }));
  },
  async getGenerated(kind: string) {
    const j = await json<{ result: unknown }>(await fetch("/api/organiser/generate?kind=" + encodeURIComponent(kind), { cache: "no-store" }));
    return j && j.result ? j : null;
  },
  async generate(kind: string, includeSamples: boolean) {
    return json<{ n: number; samples: number; at: string; result: unknown }>(
      await fetch("/api/organiser/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, includeSamples }),
      }),
    );
  },
  async me() {
    return json<{ id: string; name: string; role: "owner" | "organiser" }>(await fetch("/api/organiser/me", { cache: "no-store" }));
  },
  async getSettings() {
    return json<{ emailMode: string; emailSending: boolean }>(await fetch("/api/organiser/settings", { cache: "no-store" }));
  },
  async saveSettings(settings: { emailMode: string }) {
    return json<{ emailMode: string; emailSending: boolean }>(
      await fetch("/api/organiser/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) }),
    );
  },
  async costs() {
    return json<unknown>(await fetch("/api/organiser/costs", { cache: "no-store" }));
  },
  async activity() {
    const j = await json<{ entries: unknown[] }>(await fetch("/api/organiser/audit", { cache: "no-store" }));
    return Array.isArray(j.entries) ? j.entries : [];
  },
  async saveShareback(result: unknown) {
    return json<unknown>(
      await fetch("/api/organiser/generate", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "shareback", result }),
      }),
    );
  },
};

function installGlobals() {
  const w = W();
  const A = Aiwd as unknown as Record<string, unknown>;
  w.Prompts = A; // QUESTIONNAIRE, QUESTION_ORDER, questionSkipped, optionLabel, DOMAINS, LADDER, STANCES …
  w.Engine = {
    ...A, // stats, helpMap, divergenceFor, WANT_KEYWORDS, EXPECTED, TOL …
    llm: { available: true, init: async () => "server" },
  };
  w.SEED = Aiwd.SEED;
  w.Store = Store;
  w.App = { ui: { el, toast, copy }, navigate: (h: string) => (window.location.href = "/" + String(h).replace(/^#/, "")), currentView: null };
}

const loaded: Record<string, Promise<void>> = {};
function loadScript(src: string): Promise<void> {
  if (!loaded[src]) {
    loaded[src] = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = () => resolve();
      s.onerror = () => {
        delete loaded[src];
        reject(new Error("could not load " + src));
      };
      document.body.appendChild(s);
    });
  }
  return loaded[src];
}

export function LegacyMount({ view }: { view: View }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        installGlobals();
        await loadScript("/legacy/organiser.js");
        if (view === "network") await loadScript("/legacy/network.js");
        const mod = view === "organiser" ? W().OrganiserView : W().NetworkView;
        if (!mod || !ref.current || cancelled) return;
        await mod.render(ref.current);
        window.scrollTo(0, 0);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
      try {
        W().OrganiserView?.closeDetail?.();
      } catch {
        /* ignore */
      }
    };
  }, [view]);

  return (
    <>
      {error && (
        <div className="notice bad" role="alert">
          This view hit an error: {error}
        </div>
      )}
      <div ref={ref} id={view === "organiser" ? "organiser-mount" : "network-mount"} />
    </>
  );
}
