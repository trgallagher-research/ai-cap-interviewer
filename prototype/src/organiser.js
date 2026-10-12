/* organiser.js — the organiser's view: network map, gaps, who can help whom, product signals, imports.
 *
 * Defines ONE global: window.OrganiserView. Depends on Prompts, Engine, (optional) Store, (optional) SEED,
 * and the App.ui helpers from index.html (toast, copy, navigate). Everything drawn here is inline SVG
 * or plain DOM; colours come from the tokens index.html defines, plus the chart ramp declared below.
 */
(function () {
  "use strict";

  const P = () => window.Prompts;
  const E = () => window.Engine;
  const DOMAIN_SHORT = {
    writing: "Writing", prep: "Preparing", analysis: "Analysis", thinking: "Thinking partner",
    client: "With clients", learning: "Learning", admin: "Admin", building: "Building tools",
  };
  const KIND_LABEL = {
    "aligned": "In step",
    "confident-starter": "More confident than practice",
    "cautious-practitioner": "Less confident than practice",
    "unrated": "No ratings given",
  };
  const KIND_SHORT = { "aligned": "in step", "confident-starter": "above", "cautious-practitioner": "below" };
  const STANCE_LABEL = { enthusiast: "enthusiast", pragmatic: "pragmatic", cautious: "cautious", sceptical: "sceptical", worried: "worried" };
  const LS = { samples: "aiwd.showSamples", productRead: "aiwd.productRead", profiles: "aiwd.profiles" };

  // ---------------------------------------------------------------------------
  // Tiny DOM helpers (local, so this file does not depend on the exact shape of App.ui.el)
  // ---------------------------------------------------------------------------
  const SVG_NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    applyAttrs(node, attrs);
    appendChildren(node, children);
    return node;
  }
  function svg(tag, attrs, children) {
    const node = document.createElementNS(SVG_NS, tag);
    applyAttrs(node, attrs);
    appendChildren(node, children);
    return node;
  }
  function applyAttrs(node, attrs) {
    if (!attrs) return;
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === "on") { for (const ev of Object.keys(v)) node.addEventListener(ev, v[ev]); }
      else if (k === "style" && typeof v === "object") { Object.assign(node.style, v); }
      else if (k === "dataset") { Object.assign(node.dataset, v); }
      else node.setAttribute(k, v === true ? "" : String(v));
    }
  }
  function appendChildren(node, children) {
    if (children === undefined || children === null) return;
    const list = Array.isArray(children) ? children : [children];
    for (const c of list) {
      if (c === undefined || c === null || c === false) continue;
      node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    }
  }
  function ui() { return (window.App && window.App.ui) || {}; }
  function toast(msg) { if (ui().toast) ui().toast(msg); }
  function copyText(text, btn) {
    if (ui().copy) return ui().copy(text, btn);
    try { navigator.clipboard.writeText(text); } catch (_) { /* ignore */ }
    if (btn) { const old = btn.textContent; btn.textContent = "Copied"; setTimeout(() => { btn.textContent = old; }, 2000); }
  }
  function lsGet(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function lsSet(key, val) { try { localStorage.setItem(key, val); } catch (_) { /* ignore */ } }
  function lsDel(key) { try { localStorage.removeItem(key); } catch (_) { /* ignore */ } }
  function jsonGet(key) { const raw = lsGet(key); if (!raw) return null; try { return JSON.parse(raw); } catch (_) { return null; } }

  function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }
  function levelOf(p) { return Math.min(4, Math.max(0, Math.round(Number(p.practice && p.practice.level) || 0))); }
  function levelLabel(l) { const L = P().LADDER[l]; return L ? L.label : String(l); }
  function meanOf(p) { const m = p.confidence && p.confidence.mean; return Number.isFinite(m) ? m : null; }
  function kindOf(p) { const k = (p.divergence && p.divergence.kind) || "aligned"; return (meanOf(p) === null) ? "unrated" : k; }
  function isSample(p) { return p.source === "seed"; }
  /** Domains the member ticked in the quick questions but gave no episode for. */
  function claimedOnly(p) {
    const sr = p.selfReport; if (!sr || !Array.isArray(sr.domains)) return [];
    const ev = new Set((p.practice.domains || []).map((d) => d.key));
    return sr.domains.filter((k) => !ev.has(k));
  }
  function probedOnly(p) { const pr = p.practice.probedNoEpisode; return Array.isArray(pr) ? claimedOnly(p).filter((k) => pr.includes(k)) : []; }
  const BEYOND = { 0: "done before", 1: "a step beyond", 2: "two steps beyond" };
  function payOf(p) { const ps = p.productSignals || {}; return ps.pay || (p.questionnaire && p.questionnaire.pay) || ""; }
  function optLabel(qid, key) { return (P().optionLabel ? P().optionLabel(qid, key) : key); }
  const FREQ_SHORT = { never: "Never", tried: "Tried", monthly: "Monthly", weekly: "Weekly", daily: "Daily" };

  // ---------------------------------------------------------------------------
  // Styles (scoped under .og-root / .nw-root; tokens only, plus the validated ladder ramp)
  // ---------------------------------------------------------------------------
  const CSS = `
:root { --og-l0:#7DBCBD; --og-l1:#56A4A6; --og-l2:#378A8D; --og-l3:#1C6A6D; --og-l4:#0E4A4D; --og-segtext:#FFFFFF; --og-segtext-light:#0B1F20; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --og-l0:#2A5E5F; --og-l1:#3A7F81; --og-l2:#4FA3A5; --og-l3:#7CC8CA; --og-l4:#B4E4E5; --og-segtext:#0B1F20; --og-segtext-light:#EAF0EE; } }
:root[data-theme="dark"] { --og-l0:#2A5E5F; --og-l1:#3A7F81; --og-l2:#4FA3A5; --og-l3:#7CC8CA; --og-l4:#B4E4E5; --og-segtext:#0B1F20; --og-segtext-light:#EAF0EE; }

.og-root { max-width: 72rem; margin: 0 auto; padding: 0 0 3rem; color: var(--fg); font-family: var(--font-body); }
.og-root h1, .og-root h2, .og-root h3 { font-family: var(--font-display); font-weight: 500; margin: 0; }
.og-root h1 { font-size: 1.75rem; line-height: 1.2; }
.og-root h2 { font-size: 1.3rem; line-height: 1.25; }
.og-root h3 { font-size: 1.05rem; }
.og-root p { margin: 0; }
.og-head { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; justify-content: space-between; padding: 1.5rem 0 1rem; }
.og-head .lede { color: var(--fg-2); max-width: 46rem; margin-top: .35rem; }
.og-toggle { display: inline-flex; align-items: center; gap: .5rem; font-size: .9rem; color: var(--fg-2); cursor: pointer; padding: .35rem .5rem; border-radius: var(--radius); }
.og-toggle input { width: 1.05rem; height: 1.05rem; accent-color: var(--accent); margin: 0; }
.og-toggle:focus-within { outline: 2px solid var(--accent); outline-offset: 2px; }
.og-banner { background: var(--accent-soft); color: var(--fg); border-radius: var(--radius); padding: .65rem .9rem; font-size: .9rem; margin: 0 0 1.25rem; display: flex; gap: .6rem; align-items: baseline; }
.og-banner .pill { flex: none; }
.og-section { padding: 1.5rem 0; border-top: 1px solid var(--line); }
.og-section > header { margin-bottom: .9rem; }
.og-section > header p { color: var(--fg-2); margin-top: .3rem; max-width: 46rem; }
.og-caption { color: var(--muted); font-size: .85rem; margin-top: .5rem; max-width: 46rem; }
.og-note { color: var(--fg-2); font-size: .9rem; }
.og-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: .75rem; margin-bottom: 1rem; }
.og-stat { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: .9rem 1rem; min-width: 0; }
.og-stat .label { font-size: .8rem; color: var(--fg-2); }
.og-stat .value { font-size: 2rem; font-weight: 600; line-height: 1.1; margin: .15rem 0; }
.og-stat .value small { font-size: 1rem; font-weight: 500; color: var(--fg-2); margin-left: .25rem; }
.og-stat .hint { font-size: .8rem; color: var(--muted); }
.og-spread { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: .9rem 1rem; }
.og-spread .title { font-size: .8rem; color: var(--fg-2); margin-bottom: .5rem; display: flex; justify-content: space-between; gap: .5rem; flex-wrap: wrap; }
.og-spreadbar { display: flex; gap: 2px; height: 30px; width: 100%; }
.og-spreadbar .seg { flex: 1 1 0; min-width: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 600; }
.og-spreadbar .seg-0 { background: var(--og-l0); } .og-spreadbar .seg-1 { background: var(--og-l1); } .og-spreadbar .seg-2 { background: var(--og-l2); } .og-spreadbar .seg-3 { background: var(--og-l3); } .og-spreadbar .seg-4 { background: var(--og-l4); }
.og-spreadbar .seg span { color: var(--og-segtext); }
.og-spreadbar .seg-0 span, .og-spreadbar .seg-1 span { color: var(--og-segtext-light); }
.og-spreadlegend { display: flex; flex-wrap: wrap; gap: .4rem 1rem; margin-top: .6rem; font-size: .85rem; color: var(--fg-2); }
.og-spreadlegend span { display: inline-flex; align-items: center; gap: .4rem; }
.og-sw { width: .8rem; height: .8rem; border-radius: 3px; display: inline-block; flex: none; }
.og-levels { margin-top: .75rem; font-size: .9rem; }
.og-levels summary { cursor: pointer; color: var(--accent); font-weight: 500; }
.og-levels summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }
.og-levels ol { margin: .5rem 0 0; padding-left: 1.2rem; display: grid; gap: .3rem; color: var(--fg-2); }
.og-levels li b { color: var(--fg); font-weight: 600; }
.og-chartwrap { position: relative; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: .75rem .5rem .25rem; }
.og-chart { width: 100%; height: auto; display: block; font-family: var(--font-body); }
.og-chart .axis { stroke: var(--line); stroke-width: 1; }
.og-chart .grid { stroke: var(--line); stroke-width: 1; }
.og-chart text { fill: var(--fg-2); font-size: 12px; }
.og-chart text.tick { fill: var(--muted); font-size: 11px; }
.og-chart text.lbl { fill: var(--fg-2); font-size: 11px; pointer-events: none; }
.og-chart text.axisname { fill: var(--fg-2); font-size: 12px; }
.og-chart .tickline { stroke: var(--muted); stroke-width: 1.5; }
.og-chart .tickend { stroke: var(--muted); stroke-width: 1.5; }
.og-chart .dot { cursor: pointer; outline: none; }
.og-chart .dot .hit { fill: transparent; }
.og-chart .dot .mark { stroke: var(--surface); stroke-width: 2; }
.og-chart .k-aligned .mark { fill: var(--surface); stroke: var(--muted); stroke-width: 2; }
.og-chart .k-confident-starter .mark { fill: var(--warm); stroke: var(--surface); }
.og-chart .k-cautious-practitioner .mark { fill: var(--accent); stroke: var(--surface); }
.og-chart .dot:hover .mark, .og-chart .dot:focus-visible .mark { stroke: var(--fg); }
.og-chart .dot:focus-visible .hit { stroke: var(--accent); stroke-width: 2; }
.og-chart .dot.sample .mark { stroke-dasharray: 4 3; }
.og-legend { display: flex; flex-wrap: wrap; gap: .4rem 1.1rem; font-size: .85rem; color: var(--fg-2); padding: .4rem .5rem .5rem; }
.og-legend span { display: inline-flex; align-items: center; gap: .4rem; }
.og-legend svg { width: 14px; height: 14px; }
.og-tip { position: absolute; z-index: 5; pointer-events: none; background: var(--fg); color: var(--bg); border-radius: var(--radius); padding: .45rem .6rem; font-size: .8rem; line-height: 1.35; max-width: 16rem; box-shadow: 0 2px 8px rgba(0,0,0,.2); display: none; }
.og-tip.show { display: block; }
.og-tip b { font-weight: 600; display: block; }
.og-tip .m { opacity: .8; }
.og-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--surface); position: relative; }
.og-heat { border-collapse: separate; border-spacing: 0; width: 100%; min-width: 640px; font-size: .85rem; }
.og-heat th, .og-heat td { padding: .35rem .4rem; text-align: left; vertical-align: middle; border-bottom: 1px solid var(--line); }
.og-heat thead th { font-weight: 500; color: var(--fg-2); font-size: .78rem; line-height: 1.2; vertical-align: bottom; position: sticky; top: 0; background: var(--surface); }
.og-heat thead th .gap { display: block; margin-top: .2rem; }
.og-heat th.who { position: sticky; left: 0; background: var(--surface); z-index: 1; min-width: 10rem; }
.og-heat tbody th.who { font-weight: 500; color: var(--fg); }
.og-heat tbody th.who small { display: block; color: var(--muted); font-weight: 400; font-size: .75rem; }
.og-heat tbody th.who small.noev { font-style: italic; }
.og-heat td.cell { width: 3.2rem; padding: 3px; }
.og-heat .hm { display: block; width: 100%; height: 1.6rem; border-radius: 4px; border: 0; background: var(--surface-2); padding: 0; cursor: default; }
.og-heat .hm.has { cursor: pointer; }
.og-heat .hm.has:hover, .og-heat .hm.has:focus-visible { outline: 2px solid var(--fg); outline-offset: 1px; }
.og-heat .hm.claim, .og-claimsw { background: repeating-linear-gradient(135deg, transparent 0 4px, var(--line) 4px 6px), var(--surface); box-shadow: inset 0 0 0 1.5px var(--muted); cursor: help; }
.og-heat .hm.claim.probed, .og-claimsw.probed { background: repeating-linear-gradient(135deg, transparent 0 3px, var(--muted) 3px 4.5px), var(--surface); box-shadow: inset 0 0 0 2px var(--fg-2); position: relative; }
.og-heat .hm.claim.probed::after { content: ""; position: absolute; right: 4px; top: 50%; width: 6px; height: 6px; margin-top: -3px; border-radius: 50%; background: var(--fg-2); box-shadow: 0 0 0 2px var(--surface); }
.og-claimsw.probed { position: relative; }
.og-heat .hm.claim:hover, .og-heat .hm.claim:focus-visible { outline: 2px solid var(--fg); outline-offset: 1px; }
.og-heat tfoot tr.claimrow td, .og-heat tfoot tr.claimrow th { color: var(--muted); }
.og-freq { margin-top: .8rem; }
.og-freq .title { font-size: .8rem; color: var(--fg-2); margin-bottom: .35rem; }
.og-freqbar { display: flex; gap: 2px; height: 18px; }
.og-freqbar .seg { flex: 1 1 0; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: .72rem; font-weight: 600; }
.og-ramp + .og-caption, .og-ramp + .og-ramp { margin-top: .5rem; }
.og-paytally { display: grid; gap: .55rem; margin: .4rem 0 .5rem; }
.og-payrow { display: grid; grid-template-columns: minmax(0, 1fr); gap: .2rem; font-size: .88rem; }
.og-payrow .lab { display: flex; justify-content: space-between; gap: .5rem; }
.og-payrow .lab .n { font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--fg-2); flex: none; }
.og-paybar { display: flex; gap: 2px; height: 16px; position: relative; }
.og-paybar .seg { border-radius: 4px; min-width: 6px; display: flex; align-items: center; justify-content: center; font-size: .7rem; font-weight: 600; color: var(--accent-fg); cursor: default; }
.og-paybar .seg:focus-visible, .og-paybar .seg:hover { outline: 2px solid var(--fg); outline-offset: 1px; }
.og-paybar .seg.yes, .og-sw.yes { background: var(--warm); }
.og-paybar .seg.maybe, .og-sw.maybe { background: var(--accent); }
.og-paybar .seg.unsure, .og-sw.unsure { background: var(--accent-soft); box-shadow: inset 0 0 0 1.5px var(--accent); }
.og-paybar .seg.unsure { color: var(--fg); }
.og-paybar .seg.no, .og-sw.no { background: var(--muted); }
.og-paybar .seg.none, .og-sw.none { background: var(--surface-2); box-shadow: inset 0 0 0 1.5px var(--muted); }
.og-paybar .seg.none { color: var(--fg-2); }
.og-list .og-quote { font-size: .88rem; }
.og-qq { display: grid; grid-template-columns: auto 1fr; gap: .2rem .75rem; margin: 0; font-size: .9rem; }
.og-qq dt { color: var(--muted); }
.og-qq dd { margin: 0; }
.og-drawer .dom.claim b { font-weight: 500; color: var(--fg-2); }
.og-drawer .dom.claim span { color: var(--muted); font-style: italic; }
.og-drawer .dom.claim.probed span { color: var(--fg-2); }
.og-bar .t .bey { flex: none; font-size: .7rem; color: var(--fg-2); border: 1px solid var(--line); border-radius: 999px; padding: 0 .4rem; white-space: nowrap; }
.og-transcript .tap { font-size: .7rem; color: var(--muted); border: 1px dashed var(--muted); border-radius: 3px; padding: 0 .3rem; margin-left: .4rem; font-weight: 400; text-transform: none; letter-spacing: 0; }
.og-heat .hm:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.og-heat tfoot td, .og-heat tfoot th { font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--fg-2); font-size: .8rem; border-bottom: 0; }
.og-heat tfoot th { font-family: var(--font-body); font-weight: 500; }
.og-heat .lv { font-family: var(--font-mono); font-size: .75rem; color: var(--muted); }
.og-ramp { display: flex; flex-wrap: wrap; gap: .4rem 1rem; font-size: .85rem; color: var(--fg-2); margin-top: .6rem; }
.og-ramp span { display: inline-flex; align-items: center; gap: .4rem; }
.og-help { display: grid; grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr)); gap: .75rem; }
.og-helpcard { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: .9rem 1rem; }
.og-helpcard h3 { margin-bottom: .5rem; }
.og-helpcard .eyebrow { margin-top: .5rem; }
.og-helpcard ul { margin: .25rem 0 0; padding-left: 1.1rem; display: grid; gap: .2rem; font-size: .9rem; }
.og-helpcard li small { color: var(--muted); }
.og-helpcard .nobody { color: var(--warn); font-size: .9rem; margin-top: .25rem; }
.og-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: .75rem; }
.og-list { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: .9rem 1rem; }
.og-list h3 { margin-bottom: .2rem; }
.og-list .sub { color: var(--muted); font-size: .8rem; margin-bottom: .5rem; }
.og-list ul { margin: 0; padding-left: 1.1rem; display: grid; gap: .3rem; font-size: .9rem; }
.og-list li small { color: var(--muted); }
.og-list ul.tally { margin-bottom: .2rem; }
.og-list ul.tally li { color: var(--fg); }
.og-list .empty { color: var(--muted); font-size: .9rem; }
.og-product { margin-top: .75rem; }
.og-product .actions { display: flex; gap: .6rem; flex-wrap: wrap; align-items: center; margin: .5rem 0; }
.og-product .verdict { font-size: 1.05rem; font-weight: 500; margin: .4rem 0 .6rem; }
.og-product .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: .6rem; margin: .5rem 0; }
.og-product .opt { background: var(--surface-2); border-radius: var(--radius); padding: .7rem .8rem; font-size: .9rem; }
.og-product .opt h4 { margin: 0 0 .3rem; font-size: .95rem; font-weight: 600; }
.og-product .opt dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: .15rem .5rem; }
.og-product .opt dt { color: var(--muted); font-size: .8rem; }
.og-product .opt dd { margin: 0; }
.og-product ul { margin: .2rem 0 .4rem; padding-left: 1.1rem; font-size: .9rem; display: grid; gap: .2rem; }
.og-product .err { color: var(--bad); font-size: .9rem; }
.og-members { display: grid; grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); gap: .6rem; }
.og-member { text-align: left; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); padding: .75rem .9rem; cursor: pointer; color: var(--fg); font: inherit; display: grid; gap: .35rem; }
.og-member:hover { border-color: var(--accent); }
.og-member:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.og-member .name { font-weight: 600; display: flex; gap: .5rem; align-items: baseline; flex-wrap: wrap; }
.og-member .name small { color: var(--muted); font-weight: 400; }
.og-member .meta { display: flex; flex-wrap: wrap; gap: .3rem; font-size: .8rem; align-items: center; color: var(--fg-2); }
.og-member .meta .pill { font-size: .72rem; }
.og-member .mean { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.og-pill-lv { display: inline-flex; align-items: center; gap: .35rem; }
.og-pill-lv i { width: .6rem; height: .6rem; border-radius: 2px; display: inline-block; }
.og-drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 40; }
.og-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(34rem, 100%); box-sizing: border-box; background: var(--surface); border-left: 1px solid var(--line); z-index: 41; overflow-y: auto; padding: 1.25rem 1.25rem 3rem; box-shadow: -4px 0 24px rgba(0,0,0,.18); color: var(--fg); }
@media (prefers-reduced-motion: no-preference) { .og-drawer { animation: og-slide .18s ease-out; } @keyframes og-slide { from { transform: translateX(24px); } to { transform: none; } } }
.og-drawer .top { display: flex; justify-content: space-between; align-items: flex-start; gap: .75rem; margin-bottom: .75rem; }
.og-drawer .top h2 { font-family: var(--font-display); font-weight: 500; font-size: 1.4rem; margin: 0; }
.og-drawer .top .role { color: var(--fg-2); }
.og-drawer .close { flex: none; }
.og-drawer section { padding: .8rem 0; border-top: 1px solid var(--line); }
.og-drawer section h3 { font-family: var(--font-body); font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); font-weight: 600; margin: 0 0 .4rem; }
.og-drawer section p { margin: 0 0 .35rem; font-size: .93rem; line-height: 1.5; }
.og-drawer section ul { margin: 0; padding-left: 1.1rem; font-size: .93rem; display: grid; gap: .25rem; }
.og-drawer .pills { display: flex; flex-wrap: wrap; gap: .3rem; margin-bottom: .6rem; }
.og-drawer .dom { margin: 0 0 .5rem; font-size: .9rem; }
.og-drawer .dom b { font-weight: 600; display: block; }
.og-drawer .dom span { color: var(--fg-2); }
.og-bars { display: grid; gap: .5rem; }
.og-bar { display: grid; gap: .2rem; font-size: .88rem; }
.og-bar .t { display: flex; gap: .5rem; align-items: baseline; }
.og-bar .t .lv { flex: none; font-family: var(--font-mono); font-size: .72rem; color: var(--muted); }
.og-bar .track { height: 10px; background: var(--surface-2); border-radius: 4px; position: relative; overflow: hidden; }
.og-bar .fill { position: absolute; left: 0; top: 0; bottom: 0; background: var(--accent); border-radius: 0 4px 4px 0; }
.og-bar .v { font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--fg-2); font-size: .8rem; }
.og-quote { border-left: 3px solid var(--line); padding-left: .7rem; color: var(--fg-2); font-style: italic; margin: 0 0 .4rem; font-size: .92rem; }
.og-drawer details summary { cursor: pointer; color: var(--accent); font-size: .9rem; }
.og-drawer details summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }
.og-transcript { margin-top: .5rem; display: grid; gap: .4rem; font-size: .88rem; }
.og-transcript .turn b { color: var(--muted); font-weight: 600; font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; display: block; }
.og-import { display: grid; gap: .6rem; max-width: 46rem; }
.og-import .row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.og-import .textarea { min-height: 5rem; width: 100%; box-sizing: border-box; font-family: var(--font-mono); font-size: .8rem; }
.og-import .msg { font-size: .9rem; color: var(--fg-2); }
.og-import .msg.bad { color: var(--bad); }
.og-import .confirm { display: inline-flex; gap: .5rem; align-items: center; flex-wrap: wrap; }
.og-empty { background: var(--surface); border: 1px dashed var(--line); border-radius: var(--radius-lg); padding: 1.5rem; max-width: 46rem; margin: 1rem 0; }
.og-empty h2 { margin-bottom: .5rem; }
.og-empty ol { margin: .5rem 0 0; padding-left: 1.2rem; color: var(--fg-2); display: grid; gap: .3rem; }
.og-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.og-sample-tag { font-family: var(--font-mono); font-size: .68rem; color: var(--muted); border: 1px dashed var(--muted); border-radius: 3px; padding: 0 .3rem; vertical-align: middle; }
@media (max-width: 640px) {
  .og-root h1 { font-size: 1.45rem; }
  .og-stat .value { font-size: 1.6rem; }
  .og-drawer { width: 100%; left: 0; border-left: 0; padding: 1rem 1rem 3rem; }
  .og-heat th.who { min-width: 8rem; }
}
`;
  function ensureStyles() {
    if (document.getElementById("og-styles")) return;
    const s = document.createElement("style"); s.id = "og-styles"; s.textContent = CSS; document.head.appendChild(s);
  }

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------
  function samplesOn() { const v = lsGet(LS.samples); return v === null ? true : v !== "0"; }
  function setSamplesOn(on) { lsSet(LS.samples, on ? "1" : "0"); }

  async function loadStored() {
    if (!window.Store || typeof window.Store.loadAll !== "function") return [];
    try {
      const r = window.Store.loadAll();
      const list = (r && typeof r.then === "function") ? await r : r;
      return Array.isArray(list) ? list : [];
    } catch (_) { return []; }
  }

  function normalise(p) {
    // Defensive: fill missing bits so the view never throws on a half-formed record.
    const q = Object.assign({}, p);
    q.member = Object.assign({ name: "Anonymous", role: "", org: "" }, p.member || {});
    q.practice = Object.assign({ level: 0, levelLabel: "", summary: "", domains: [], tools: [], judgement: "", stance: "pragmatic" }, p.practice || {});
    q.practice.domains = Array.isArray(q.practice.domains) ? q.practice.domains : [];
    q.practice.tools = Array.isArray(q.practice.tools) ? q.practice.tools : [];
    q.confidence = Object.assign({ items: [], mean: null, band: "none", pattern: "" }, p.confidence || {});
    q.confidence.items = Array.isArray(q.confidence.items) ? q.confidence.items : [];
    q.divergence = p.divergence || { kind: "aligned", note: "" };
    q.wants = Array.isArray(p.wants) ? p.wants : [];
    q.offers = Array.isArray(p.offers) ? p.offers : [];
    q.productSignals = Object.assign({ wouldPayFor: "", quote: "" }, p.productSignals || {});
    q.feedback = Object.assign({ headline: "", summary: "", strengths: [], nextSteps: [], closing: "" }, p.feedback || {});
    q.quotes = Array.isArray(p.quotes) ? p.quotes : [];
    q.id = p.id || ("p_" + hash(JSON.stringify(p.member || {})).toString(36).slice(2, 9));
    return q;
  }

  /** Stored profiles merged with SEED when the sample toggle is on. Shared with NetworkView. */
  async function loadProfiles() {
    const stored = (await loadStored()).map(normalise);
    const seen = new Set(stored.map((p) => p.id));
    let out = stored.slice();
    if (samplesOn() && Array.isArray(window.SEED)) {
      for (const s of window.SEED) {
        const q = normalise(s); q.source = "seed";
        if (!seen.has(q.id)) { out.push(q); seen.add(q.id); }
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Shared drawings
  // ---------------------------------------------------------------------------

  /** Practice-spread stacked bar: one horizontal bar of five ladder segments (HTML, so it reads at any width). */
  function drawSpreadBar(stats, opts) {
    opts = opts || {};
    const L = P().LADDER;
    const total = stats.byLevel.reduce((a, b) => a + b, 0) || 1;
    const bar = el("div", { class: "og-spreadbar", role: "img", "aria-label": "Practice spread: " + L.map((l, i) => stats.byLevel[i] + " " + l.label).join(", ") });
    stats.byLevel.forEach((n, i) => {
      if (!n) return;
      const pct = (n / total) * 100;
      const seg = el("div", { class: "seg seg-" + i, style: { flexGrow: String(n) }, title: `${L[i].label}: ${plural(n, "member")}` });
      if (pct >= 6) seg.appendChild(el("span", null, String(n)));
      bar.appendChild(seg);
    });
    const wrap = el("div", { class: "og-spread" });
    if (!opts.bare) wrap.appendChild(el("div", { class: "title" }, [el("span", null, "Practice spread: how far AI use has gone in each member's work"), el("span", null, plural(total, "member"))]));
    wrap.appendChild(bar);
    wrap.appendChild(el("div", { class: "og-spreadlegend", "aria-hidden": "true" }, L.map((l, i) => el("span", null, [el("i", { class: "og-sw", style: { background: `var(--og-l${i})` } }), `${l.label} (${stats.byLevel[i]})`]))));
    return wrap;
  }

  /** Compact five-segment strip from the quick questions: how often members said they use AI. */
  function drawFrequencyStrip(stats) {
    const q = stats.questionnaire;
    if (!q || !q.answered) return null;
    const keys = ["never", "tried", "monthly", "weekly", "daily"];
    const bar = el("div", { class: "og-freqbar", role: "img", "aria-label": "How often members said they use it: " + keys.map((k) => (q.frequency[k] || 0) + " " + FREQ_SHORT[k]).join(", ") });
    keys.forEach((k, i) => {
      const n = q.frequency[k] || 0; if (!n) return;
      bar.appendChild(el("div", { class: "seg seg-" + i, style: { flexGrow: String(n), background: `var(--og-l${i})` }, title: `${FREQ_SHORT[k]} (${optLabel("frequency", k)}): ${plural(n, "member")}` }, [el("span", { style: { color: i >= 2 ? "var(--og-segtext)" : "var(--og-segtext-light)" } }, n / q.answered >= 0.06 ? String(n) : "")]));
    });
    const missing = stats.n - q.answered;
    return el("div", { class: "og-freq", id: "og-freq" }, [
      el("div", { class: "title" }, "How often members said they use it (their own answer)" + (missing ? ` (${q.answered} of ${stats.n} answered the quick questions)` : "")),
      bar,
      el("div", { class: "og-spreadlegend", "aria-hidden": "true" }, keys.map((k, i) => el("span", null, [el("i", { class: "og-sw", style: { background: `var(--og-l${i})` } }), `${FREQ_SHORT[k]} (${q.frequency[k] || 0})`]))),
    ]);
  }

  function levelsExplainer() {
    const L = P().LADDER;
    return el("details", { class: "og-levels" }, [
      el("summary", null, "What the levels mean"),
      el("ol", { start: "0" }, L.map((l) => el("li", null, [el("b", null, l.label + ": "), l.short]))),
    ]);
  }

  function levelPill(l) {
    return el("span", { class: "pill og-pill-lv", title: "Practice level " + l }, [el("i", { style: { background: `var(--og-l${l})` } }), levelLabel(l)]);
  }
  function kindPill(kind) {
    const cls = kind === "confident-starter" ? "warn" : kind === "cautious-practitioner" ? "accent" : "";
    return el("span", { class: "pill " + cls, style: kind === "unrated" ? { color: "var(--muted)" } : null }, KIND_LABEL[kind] || kind);
  }
  function sampleTag() { return el("span", { class: "og-sample-tag", title: "A fictional sample member" }, "sample"); }

  // ---------------------------------------------------------------------------
  // Tooltip (one per chart wrapper)
  // ---------------------------------------------------------------------------
  function makeTip(wrap) {
    const tip = el("div", { class: "og-tip", role: "tooltip" });
    wrap.appendChild(tip);
    function show(lines, x, y) {
      tip.textContent = "";
      lines.forEach((ln, i) => tip.appendChild(el(i === 0 ? "b" : "div", { class: i === 0 ? "" : "m" }, ln)));
      tip.classList.add("show");
      const wr = wrap.getBoundingClientRect();
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      let left = x + 12, top = y - th - 10;
      if (left + tw > wr.width - 4) left = Math.max(4, x - tw - 12);
      if (top < 4) top = y + 14;
      tip.style.left = left + "px"; tip.style.top = top + "px";
    }
    function showAt(target, lines) {
      const r = target.getBoundingClientRect(); const wr = wrap.getBoundingClientRect();
      show(lines, r.left - wr.left + r.width / 2, r.top - wr.top);
    }
    function hide() { tip.classList.remove("show"); }
    return { show, showAt, hide };
  }

  // ---------------------------------------------------------------------------
  // Sections
  // ---------------------------------------------------------------------------
  function sectionEl(id, title, intro, body) {
    return el("section", { class: "og-section", id: "og-" + id, "aria-labelledby": "og-" + id + "-h" }, [
      el("header", null, [el("h2", { id: "og-" + id + "-h" }, title), intro ? el("p", null, intro) : null]),
      body,
    ]);
  }

  function summarySection(profiles, stats) {
    const n = stats.n;
    const scepticOrWorried = (stats.byStance.sceptical || 0) + (stats.byStance.worried || 0);
    const above = stats.byDivergence["confident-starter"] || 0;
    const below = stats.byDivergence["cautious-practitioner"] || 0;
    const unrated = stats.byDivergence["unrated"] || 0;
    const sampleN = profiles.filter(isSample).length;
    const stat = (label, value, hint, suffix) => el("div", { class: "og-stat" }, [
      el("div", { class: "label" }, label),
      el("div", { class: "value" }, [String(value), suffix ? el("small", null, suffix) : null]),
      el("div", { class: "hint" }, hint),
    ]);
    const tiles = el("div", { class: "og-stats" }, [
      stat("Members interviewed", n, sampleN ? `${sampleN} of these are fictional samples` : "Real interviews so far"),
      stat("Average confidence", stats.meanConfidence === null ? "n/a" : stats.meanConfidence, "Members rated 0 to 100 how sure they are they can do tasks from their own work. Members rated different tasks, so this is a rough comparison; the tasks' difficulty is taken into account in the marks below.", stats.meanConfidence === null ? "" : "/ 100"),
      stat("Sceptical or worried", scepticOrWorried, stats.questionnaire && stats.questionnaire.answered ? "Members who said they feel doubtful or uneasy about AI in their work" : "Members whose overall stance on AI is doubtful or uneasy"),
      stat("Confidence out of step", above + below, `${above} rate themselves above what they described doing, ${below} below` + (unrated ? `; ${unrated} gave no ratings` : "")),
    ]);
    const spread = drawSpreadBar(stats);
    spread.appendChild(levelsExplainer());
    const fq = drawFrequencyStrip(stats);
    if (fq) spread.appendChild(fq);
    return sectionEl("summary", "The network at a glance", null, el("div", null, [tiles, spread]));
  }

  function scatterSection(profiles, openDetail) {
    const wrap = el("div", { class: "og-chartwrap" });
    const tip = makeTip(wrap);
    const noMean = profiles.filter((p) => meanOf(p) === null).length;
    let narrowNow = null;
    function draw() {
      const narrow = (wrap.clientWidth || window.innerWidth) < 560;
      if (narrow === narrowNow) return;
      narrowNow = narrow;
      const old = wrap.querySelector("svg.og-chart"); if (old) old.remove();
      wrap.insertBefore(drawScatter(profiles, openDetail, tip, narrow), wrap.firstChild);
    }
    if (typeof ResizeObserver === "function") new ResizeObserver(draw).observe(wrap);
    else window.addEventListener("resize", draw);
    setTimeout(draw, 0);
    draw();
    const legendMark = (kind) => {
      const s = svg("svg", { viewBox: "0 0 14 14", class: "og-chart", "aria-hidden": "true" });
      const g = svg("g", { class: "lgmark k-" + kind });
      if (kind === "confident-starter") g.appendChild(svg("polygon", { points: "7,1 13,13 1,13", class: "mark", "stroke-width": "1" }));
      else if (kind === "cautious-practitioner") g.appendChild(svg("polygon", { points: "7,13 13,1 1,1", class: "mark", "stroke-width": "1" }));
      else g.appendChild(svg("circle", { cx: 7, cy: 7, r: 5, class: "mark", "stroke-width": "1.5" }));
      s.appendChild(g); return s;
    };
    wrap.appendChild(el("div", { class: "og-legend", "aria-label": "Legend" }, [
      el("span", null, [legendMark("confident-starter"), KIND_LABEL["confident-starter"]]),
      el("span", null, [legendMark("cautious-practitioner"), KIND_LABEL["cautious-practitioner"]]),
      el("span", null, [legendMark("aligned"), KIND_LABEL["aligned"]]),
      el("span", null, [(() => { const t = svg("svg", { viewBox: "0 0 14 14", class: "og-chart", "aria-hidden": "true" }); t.appendChild(svg("line", { x1: 7, x2: 7, y1: 2, y2: 12, class: "tickline" })); t.appendChild(svg("line", { x1: 3, x2: 11, y1: 2, y2: 2, class: "tickend" })); return t; })(), "thin line: where their own rated tasks would predict their confidence"]),
    ]));
    const caption = el("p", { class: "og-caption" },
      "Each mark is one member. Left to right is how far AI use has gone in their work, from what they described; " +
      "up and down is how confident they said they are. The thin line under or over each mark runs from where that member's own rated tasks would predict their confidence (the short crossbar) to what they actually rated. " +
      "A mark well above its crossbar means they rate themselves more confident than what they described doing; well below it, less; a short or absent line means the two are in step. " +
      "For members who have not used AI, low confidence is expected, so it is not marked. " +
      "Hover or tab to a mark to see who it is; click it to open their details." +
      (noMean ? ` ${plural(noMean, "member")} gave no ratings and ${noMean === 1 ? "is" : "are"} not shown here.` : ""));
    return sectionEl("scatter", "Practice and confidence", "Where what people do and how sure they feel line up, and where they do not.", el("div", null, [wrap, caption]));
  }

  function drawScatter(profiles, openDetail, tip, narrow) {
    const Eng = E(); const L = P().LADDER;
    const W = narrow ? 400 : 720, H = narrow ? 360 : 400, m = narrow ? { t: 16, r: 10, b: 56, l: 40 } : { t: 20, r: 20, b: 58, l: 46 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const bandW = pw / 5;
    const xc = (lv) => m.l + bandW * lv + bandW / 2;
    const yv = (v) => m.t + ph - (v / 100) * ph;
    const chart = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "og-chart", role: "img", "aria-label": "Practice level against mean confidence, one mark per member" });
    // grid + axes
    [0, 25, 50, 75, 100].forEach((v) => {
      chart.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: yv(v), y2: yv(v), class: "grid" }));
      chart.appendChild(svg("text", { x: m.l - 8, y: yv(v) + 4, "text-anchor": "end", class: "tick" }, String(v)));
    });
    // axes
    chart.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: m.t + ph, y2: m.t + ph, class: "axis" }));
    L.forEach((l, i) => {
      chart.appendChild(svg("text", { x: xc(i), y: m.t + ph + 16, "text-anchor": "middle", class: narrow ? "tick" : "" }, l.label));
      chart.appendChild(svg("text", { x: xc(i), y: m.t + ph + 30, "text-anchor": "middle", class: "tick" }, "level " + i));
      if (i > 0) chart.appendChild(svg("line", { x1: m.l + bandW * i, x2: m.l + bandW * i, y1: m.t, y2: m.t + ph, class: "grid", "stroke-dasharray": "0" }));
    });
    chart.appendChild(svg("text", { x: m.l + pw / 2, y: H - 8, "text-anchor": "middle", class: "axisname" }, narrow ? "Practice level (what they described doing)" : "Practice level, from what they described doing"));
    chart.appendChild(svg("text", { x: 12, y: m.t + ph / 2, "text-anchor": "middle", transform: `rotate(-90 12 ${m.t + ph / 2})`, class: "axisname" }, narrow ? "Confidence (0 to 100)" : "Average confidence (0 to 100)"));

    const ticks = svg("g", { class: "ticks", "aria-hidden": "true" });
    const dots = svg("g", { class: "dots" });
    const withMean = profiles.filter((p) => meanOf(p) !== null);
    const placed = [];
    withMean.forEach((p) => {
      const lv = levelOf(p); const mean = meanOf(p); const kind = kindOf(p);
      const jx = (hash(p.id + "x") - 0.5) * (bandW - 28);
      const jy = (hash(p.id + "y") - 0.5) * 6;
      const cx = xc(lv) + jx, cy = Math.min(m.t + ph - 6, Math.max(m.t + 6, yv(mean) + jy));
      let expected = null;
      if (typeof E().divergenceFor === "function") { try { const d = E().divergenceFor(lv, p.confidence.items || []); if (d && Number.isFinite(d.expected)) expected = d.expected; } catch (_) { /* ignore */ } }
      if (expected !== null) {
        const ey = yv(expected);
        // Non-users are never marked "less confident" (Engine.divergenceFor), so no line below their crossbar.
        if (!(lv === 0 && mean < expected)) ticks.appendChild(svg("line", { x1: cx, x2: cx, y1: ey, y2: cy, class: "tickline" }));
        ticks.appendChild(svg("line", { x1: cx - 5, x2: cx + 5, y1: ey, y2: ey, class: "tickend" }));
      }
      placed.push({ cx, cy, lv, kind, name: p.member.name, expected });
      const g = svg("g", { class: `dot k-${kind}${isSample(p) ? " sample" : ""}`, tabindex: "0", role: "button", "data-id": p.id, "aria-label": `${p.member.name}, ${p.member.role}: ${levelLabel(lv)}, confidence ${mean}. ${KIND_LABEL[kind]}. Opens details.` });
      g.appendChild(svg("circle", { cx, cy, r: 14, class: "hit" }));
      const r = 6;
      if (kind === "confident-starter") g.appendChild(svg("polygon", { points: `${cx},${cy - r - 1} ${cx + r + 1},${cy + r} ${cx - r - 1},${cy + r}`, class: "mark" }));
      else if (kind === "cautious-practitioner") g.appendChild(svg("polygon", { points: `${cx},${cy + r + 1} ${cx + r + 1},${cy - r} ${cx - r - 1},${cy - r}`, class: "mark" }));
      else g.appendChild(svg("circle", { cx, cy, r: r, class: "mark" }));
      const lines = [p.member.name + (isSample(p) ? " (sample)" : ""), p.member.role, `${levelLabel(lv)} (level ${lv}), confidence ${mean}` + (expected !== null ? `, their tasks would predict about ${expected}` : ""), KIND_LABEL[kind]];
      g.addEventListener("pointerenter", () => tip.showAt(g, lines));
      g.addEventListener("pointermove", () => tip.showAt(g, lines));
      g.addEventListener("pointerleave", tip.hide);
      g.addEventListener("focus", () => tip.showAt(g, lines));
      g.addEventListener("blur", tip.hide);
      g.addEventListener("click", () => openDetail(p));
      g.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); openDetail(p); } });
      dots.appendChild(g);
    });
    chart.appendChild(ticks);
    chart.appendChild(dots);
    // Name labels: to the right of each mark, nudged apart within a level band; narrow view labels only diverging marks.
    const labels = svg("g", { class: "labels", "aria-hidden": "true" });
    const LH = narrow ? 11 : 12;
    for (let lv = 0; lv < 5; lv++) {
      const inBand = placed.filter((d) => d.lv === lv && (!narrow || d.kind !== "aligned")).sort((a, b) => a.cy - b.cy);
      let lastY = -Infinity;
      inBand.forEach((d) => {
        let ly = Math.max(d.cy + 4, lastY + LH);
        if (ly > m.t + ph - 2) ly = m.t + ph - 2;
        lastY = ly;
        const estW = d.name.length * (narrow ? 5.6 : 6.4);
        const right = d.cx + 10 + estW <= W - m.r;
        labels.appendChild(svg("text", { x: right ? d.cx + 10 : d.cx - 10, y: ly, "text-anchor": right ? "start" : "end", class: "lbl" }, d.name));
      });
    }
    chart.appendChild(labels);
    return chart;
  }

  function heatmapSection(profiles, stats, openDetail) {
    const D = P().DOMAINS;
    const sorted = profiles.slice().sort((a, b) => levelOf(b) - levelOf(a) || a.member.name.localeCompare(b.member.name));
    const wrap = el("div", { class: "og-scroll" });
    const tip = makeTip(wrap);
    const table = el("table", { class: "og-heat" });
    const head = el("tr", null, [el("th", { class: "who", scope: "col" }, "Member")]);
    D.forEach((d) => {
      const isGap = stats.gaps.includes(d.key);
      head.appendChild(el("th", { scope: "col", title: d.label + ": " + d.hint }, [DOMAIN_SHORT[d.key] || d.label, isGap ? el("span", { class: "pill warn gap", title: "Fewer than two members use AI routinely or better here" }, "gap") : null]));
    });
    table.appendChild(el("thead", null, head));
    const body = el("tbody");
    sorted.forEach((p) => {
      const lv = levelOf(p);
      const tr = el("tr");
      const nameBtn = el("button", { class: "btn quiet", type: "button", style: { padding: "0", font: "inherit", textAlign: "left" }, on: { click: () => openDetail(p) } }, p.member.name);
      const noEvidence = !(p.practice.domains || []).length;
      tr.appendChild(el("th", { class: "who", scope: "row" }, [nameBtn, isSample(p) ? " " : null, isSample(p) ? sampleTag() : null, el("small", null, `${p.member.role} · ${levelLabel(lv)}`), noEvidence ? el("small", { class: "noev" }, lv === 0 ? "has not used AI tools" : "no specific uses described") : null]));
      D.forEach((d) => {
        const ev = (p.practice.domains || []).find((x) => x.key === d.key);
        const td = el("td", { class: "cell" });
        if (ev) {
          const lines = [p.member.name + ": " + d.label, ev.evidence || "(no evidence text)", `Practice level: ${levelLabel(lv)}`];
          const b = el("button", { type: "button", class: "hm has", style: { background: `var(--og-l${lv})` }, title: `${d.label}: ${ev.evidence || ""}`, "aria-label": `${p.member.name}, ${d.label}: ${ev.evidence || "evidence"}`, "data-domain": d.key, "data-level": String(lv) });
          b.addEventListener("pointerenter", () => tip.showAt(b, lines));
          b.addEventListener("pointerleave", tip.hide);
          b.addEventListener("focus", () => tip.showAt(b, lines));
          b.addEventListener("blur", tip.hide);
          b.addEventListener("click", () => openDetail(p));
          td.appendChild(b);
        } else if (claimedOnly(p).includes(d.key)) {
          const probed = probedOnly(p).includes(d.key);
          const msg = probed ? "Ticked this, and when asked gave no real example" : "Ticked this in the quick questions; the conversation did not get to it";
          const lines = [p.member.name + ": " + d.label, msg];
          const b = el("button", { type: "button", class: "hm claim" + (probed ? " probed" : ""), title: `${d.label}: ${msg}`, "aria-label": `${p.member.name}, ${d.label}: ${msg}`, "data-domain": d.key, "data-probed": probed ? "1" : "0" });
          b.addEventListener("pointerenter", () => tip.showAt(b, lines));
          b.addEventListener("pointerleave", tip.hide);
          b.addEventListener("focus", () => tip.showAt(b, lines));
          b.addEventListener("blur", tip.hide);
          b.addEventListener("click", () => openDetail(p));
          td.appendChild(b);
        } else {
          td.appendChild(el("span", { class: "hm", "aria-label": `${p.member.name}, ${d.label}: no evidence` }));
        }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    table.appendChild(body);
    const foot = el("tr", null, [el("th", { class: "who", scope: "row" }, "Members with evidence")]);
    D.forEach((d) => foot.appendChild(el("td", { class: "cell", style: { textAlign: "center" } }, String(stats.byDomain[d.key] || 0))));
    const foot2 = el("tr", null, [el("th", { class: "who", scope: "row" }, "of whom routine or better")]);
    D.forEach((d) => foot2.appendChild(el("td", { class: "cell", style: { textAlign: "center" } }, String(stats.strongByDomain[d.key] || 0))));
    const qs = stats.questionnaire;
    let foot3 = null;
    if (qs && qs.answered) {
      foot3 = el("tr", { class: "claimrow asked" }, [el("th", { class: "who", scope: "row" }, "ticked, asked, no example")]);
      D.forEach((d) => foot3.appendChild(el("td", { class: "cell", style: { textAlign: "center" } }, String((qs.probedNoEpisode || {})[d.key] || 0))));
    }
    let foot4 = null;
    if (qs && qs.answered) {
      foot4 = el("tr", { class: "claimrow notasked" }, [el("th", { class: "who", scope: "row" }, "ticked, not asked about")]);
      D.forEach((d) => foot4.appendChild(el("td", { class: "cell", style: { textAlign: "center" } }, String(((qs.claimedNoEpisode || {})[d.key] || 0) - ((qs.probedNoEpisode || {})[d.key] || 0)))));
    }
    table.appendChild(el("tfoot", null, [foot, foot2, foot3, foot4]));
    wrap.appendChild(table);
    const L = P().LADDER;
    const ramp = el("div", { class: "og-ramp", "aria-hidden": "true" }, [el("span", null, "Filled cell, shaded by that member's practice level:")].concat(L.map((l, i) => el("span", null, [el("i", { class: "og-sw", style: { background: `var(--og-l${i})` } }), l.label]))));
    const claimKey = (qs && qs.answered) ? el("div", { class: "og-ramp", "aria-hidden": "true" }, [
      el("span", null, [el("i", { class: "og-sw og-claimsw probed" }), "Dense hatch, bold outline: ticked, asked about it, no real example"]),
      el("span", null, [el("i", { class: "og-sw og-claimsw" }), "Light hatch: ticked, the conversation did not get to it"]),
    ]) : null;
    const gapNames = stats.gaps.map((k) => DOMAIN_SHORT[k] || k);
    const caption = el("p", { class: "og-caption" },
      "A filled cell means the member described a real example of using AI for that kind of work; hover or tab to a cell to read what they said. " +
      ((qs && qs.answered) ? "A hatched cell means they ticked it in the quick questions but gave no example: a dense hatch means the interviewer asked and nothing real came up (often a plan, or a claim that shrank); a light hatch means it was not reached, so it is still an open question. " : "") +
      "Columns marked \"gap\" have fewer than two members who use AI routinely or better for that kind of work, so there is little in-house knowledge to draw on there." +
      (gapNames.length ? ` Gaps right now: ${gapNames.join(", ")}.` : " There are no gaps right now."));
    const above = el("p", { class: "og-note", style: { marginBottom: ".5rem" } }, "Columns marked \"gap\" have fewer than two members who use AI routinely or better for that kind of work.");
    return sectionEl("heat", "Who knows what", "Each row is a member, each column a kind of work. Scroll sideways on a phone.", el("div", null, [above, wrap, ramp, claimKey, caption]));
  }

  function helpSection(profiles, openDetail) {
    const map = E().helpMap(profiles);
    const grid = el("div", { class: "og-help" });
    if (!map.length) grid.appendChild(el("p", { class: "og-note" }, "No helpers or seekers yet. This fills in as members describe what they do and what they want to learn."));
    map.forEach((row) => {
      const card = el("div", { class: "og-helpcard", "data-domain": row.domain });
      card.appendChild(el("h3", null, row.label));
      card.appendChild(el("div", { class: "eyebrow" }, "Could help"));
      if (row.helpers.length) {
        card.appendChild(el("ul", { class: "helpers" }, row.helpers.map((p) => el("li", null, [
          el("a", { href: "#", on: { click: (ev) => { ev.preventDefault(); openDetail(p); } } }, p.member.name), " ", el("small", null, p.member.role + (isSample(p) ? " (sample)" : "")),
        ]))));
      } else {
        card.appendChild(el("p", { class: "nobody" }, "Nobody in the network yet; this is a gap to fill from outside."));
      }
      card.appendChild(el("div", { class: "eyebrow" }, "Wants to learn"));
      if (row.seekers.length) {
        card.appendChild(el("ul", { class: "seekers" }, row.seekers.map((p) => {
          const matched = (p.wants || []).find((w) => matchesDomain(w, row.domain)) || (p.wants || [])[0] || "";
          return el("li", null, [el("a", { href: "#", on: { click: (ev) => { ev.preventDefault(); openDetail(p); } } }, p.member.name), ": ", matched, " ", el("small", null, isSample(p) ? "(sample)" : "")]);
        })));
      } else {
        card.appendChild(el("p", { class: "og-note" }, "Nobody has asked for this yet."));
      }
      grid.appendChild(card);
    });
    const caption = el("p", { class: "og-caption" }, "Helpers are members whose AI use is woven into their method or who shape it for others, with evidence in that kind of work. Seekers are members who said they want to get better at something that sounds like it.");
    return sectionEl("help", "Who could help whom", "Pairings the organiser could make, grouped by kind of work.", el("div", null, [grid, caption]));
  }
  // Mirrors WANT_KEYWORDS in engine.js (not exported); Engine.WANT_KEYWORDS is used when present.
  const WANT_KW_LOCAL = {
    writing: ["writ", "email", "proposal", "report", "linkedin", "newsletter"],
    prep: ["prepar", "workshop", "session", "design", "programme", "training", "intervention"],
    analysis: ["analy", "summar", "interview", "survey", "pattern", "data", "document"],
    thinking: ["think", "case", "sparring", "reflect", "hypothes", "sounding"],
    client: ["client", "in the room", "live with", "with a group", "with teams", "in front of"],
    learning: ["research", "theory", "literature", "course", "reading", "keep up"],
    admin: ["admin", "schedul", "invoice", "notes", "organis", "translat", "minutes"],
    building: ["build", "prompt", "automat", "tool", "gpt", "project", "script", "template"],
  };
  function wantKw() { return (E() && E().WANT_KEYWORDS) || WANT_KW_LOCAL; }
  function matchesDomain(want, key) { const w = String(want).toLowerCase(); return (wantKw()[key] || []).some((k) => w.includes(k)); }
  const SAFETY_RE = /safe|confidential|data|rules|anonymis/i;
  /** Theme tally for wants/offers: safety theme first, then a domain by keyword, else "other". */
  function themeTally(items) {
    const counts = { safety: 0, other: 0 }; P().DOMAINS.forEach((d) => { counts[d.key] = 0; });
    items.forEach((t) => {
      if (SAFETY_RE.test(t)) { counts.safety++; return; }
      const d = P().DOMAINS.find((x) => matchesDomain(t, x.key));
      counts[d ? d.key : "other"]++;
    });
    const rows = [{ label: "Safe use of client material", n: counts.safety }]
      .concat(P().DOMAINS.map((d) => ({ label: d.label, n: counts[d.key] })))
      .concat([{ label: "Other", n: counts.other }])
      .filter((r) => r.n > 0);
    rows.sort((a, b) => b.n - a.n);
    return rows;
  }
  function normKey(t) { return String(t).trim().toLowerCase().replace(/[\s.;:!,]+$/g, ""); }

  function signalsSection(profiles, stats) {
    const nameOf = (p) => p.member.name + (isSample(p) ? " (sample)" : "");
    const LIMIT = 8;
    const grouped = (title, sub, pick, cls) => {
      const items = [];
      profiles.forEach((p) => pick(p).forEach((t) => items.push({ t, p })));
      const box = el("div", { class: "og-list " + cls }, [el("h3", null, title), el("div", { class: "sub" }, sub)]);
      if (!items.length) { box.appendChild(el("p", { class: "empty" }, "Nothing yet.")); return box; }
      const tally = themeTally(items.map((i) => i.t));
      box.appendChild(el("div", { class: "eyebrow" }, "By theme"));
      box.appendChild(el("ul", { class: "tally" }, tally.map((r) => el("li", null, [r.label, " ", el("small", null, "\u00B7 " + r.n)]))));
      box.appendChild(el("div", { class: "eyebrow", style: { marginTop: ".6rem" } }, `All ${items.length}`));
      const ul = el("ul", { class: "full" });
      const draw = (all) => {
        ul.textContent = "";
        (all ? items : items.slice(0, LIMIT)).forEach((it) => ul.appendChild(el("li", null, [it.t, " ", el("small", null, nameOf(it.p))])));
      };
      draw(false);
      box.appendChild(ul);
      if (items.length > LIMIT) {
        let open = false;
        const more = el("button", { class: "btn quiet", type: "button", style: { padding: ".2rem .4rem", marginTop: ".3rem" } }, `Show all ${items.length}`);
        more.addEventListener("click", () => { open = !open; draw(open); more.textContent = open ? "Show fewer" : `Show all ${items.length}`; });
        box.appendChild(more);
      }
      return box;
    };
    const pay = () => {
      const qs = stats.questionnaire;
      if (qs && qs.answered) return payTally(profiles, stats, nameOf);
      // Older results without the quick questions: group the free-text answers.
      const groups = new Map();
      profiles.forEach((p) => {
        const t = p.productSignals && p.productSignals.wouldPayFor; if (!t) return;
        const k = normKey(t);
        if (!groups.has(k)) groups.set(k, { text: String(t).trim().replace(/[\s.;:!,]+$/g, ""), names: [] });
        groups.get(k).names.push(nameOf(p));
      });
      const rows = Array.from(groups.values()).sort((a, b) => b.names.length - a.names.length || a.text.localeCompare(b.text));
      const box = el("div", { class: "og-list pay" }, [el("h3", null, "Would pay for"), el("div", { class: "sub" }, "What members said would be worth their time or money; the same answer from several members is one line with a count")]);
      if (!rows.length) { box.appendChild(el("p", { class: "empty" }, "Nothing yet.")); return box; }
      box.appendChild(el("ul", { class: "full" }, rows.map((r) => el("li", null, [r.text, " ", el("small", null, "\u00B7 " + r.names.length + " \u00B7 " + r.names.join(", "))]))));
      return box;
    };
    const cols = el("div", { class: "og-cols" }, [
      grouped("Wants", "What members said they want to get better at", (p) => p.wants || [], "wants"),
      grouped("Offers", "What members said they could show a colleague", (p) => p.offers || [], "offers"),
      pay(),
    ]);
    const product = productCard(profiles, stats);
    return sectionEl("signals", "Wants, offers and what they would pay for", "The raw material for deciding whether there is something to offer, and to whom.", el("div", null, [cols, product]));
  }

  /** "Would pay for" from the fixed quick-question options: one bar per option, split by the pay answer. */
  function payTally(profiles, stats, nameOf) {
    const qs = stats.questionnaire;
    const opts = P().QUESTIONNAIRE.offer.options.filter((o) => o.key !== "nothing");
    const box = el("div", { class: "og-list pay" }, [el("h3", null, "Would pay for"), el("div", { class: "sub" }, "Each member ticked any number of offers and answered once whether they would pay for what they ticked.")]);
    const wrap = el("div", { style: { position: "relative" } });
    const tip = makeTip(wrap);
    const max = Math.max(1, ...opts.map((o) => qs.offer[o.key] || 0));
    const tally = el("div", { class: "og-paytally" });
    const PAY = [["yes", "Yes"], ["maybe", "Possibly"], ["unsure", "Don't know yet"], ["no", "No"], ["none", "Not answered"]];
    opts.forEach((o) => {
      const members = profiles.filter((p) => p.questionnaire && Array.isArray(p.questionnaire.offer) && p.questionnaire.offer.includes(o.key));
      const total = qs.offer[o.key] || 0;
      const split = { yes: [], maybe: [], unsure: [], no: [], none: [] };
      members.forEach((p) => { const v = payOf(p); (split[v] && v !== "none" ? split[v] : split.none).push(p); });
      const bar = el("div", { class: "og-paybar", style: { width: (total / max * 100) + "%" } });
      PAY.forEach(([k, word]) => {
        const list = split[k]; if (!list.length) return;
        const names = list.map(nameOf).join(", ");
        const lines = [`${list.length} would pay: ${word}`, o.label, names];
        const seg = el("span", { class: "seg " + k, tabindex: "0", role: "img", "data-pay": k, "data-n": String(list.length), style: { flexGrow: String(list.length) }, title: `${word}: ${list.length} (${names})`, "aria-label": `${o.label}: ${list.length} answered ${word} (${names})` }, list.length / max >= 0.12 ? String(list.length) : "");
        seg.addEventListener("pointerenter", () => tip.showAt(seg, lines));
        seg.addEventListener("pointerleave", tip.hide);
        seg.addEventListener("focus", () => tip.showAt(seg, lines));
        seg.addEventListener("blur", tip.hide);
        bar.appendChild(seg);
      });
      tally.appendChild(el("div", { class: "og-payrow", "data-offer": o.key, "data-total": String(total) }, [
        el("div", { class: "lab" }, [el("span", null, o.label), el("span", { class: "n" }, String(total))]),
        total ? bar : el("div", { class: "og-paybar" }),
      ]));
    });
    wrap.appendChild(tally);
    box.appendChild(wrap);
    box.appendChild(el("div", { class: "og-ramp", "aria-hidden": "true", style: { marginTop: "0" } }, PAY.map(([k, word]) => el("span", null, [el("i", { class: "og-sw " + k }), word]))));
    const nothing = qs.offer.nothing || 0;
    const missing = stats.n - qs.answered;
    box.appendChild(el("p", { class: "og-caption" }, `${plural(nothing, "member")} ticked "${optLabel("offer", "nothing")}".` + (missing ? ` ${plural(missing, "member")} answered before the quick questions existed and ${missing === 1 ? "is" : "are"} not counted here.` : "") + " Hover or tab to a segment to see who."));
    const words = [];
    profiles.forEach((p) => {
      const ps = p.productSignals || {};
      if (ps.quote && String(ps.quote).trim()) words.push({ t: "\u201C" + String(ps.quote).trim() + "\u201D", p });
      const other = p.questionnaire && p.questionnaire.offerOther;
      if (other && String(other).trim()) words.push({ t: "Also suggested: " + String(other).trim(), p });
    });
    if (words.length) {
      box.appendChild(el("div", { class: "eyebrow", style: { marginTop: ".6rem" } }, "In their words"));
      const ul = el("ul", { class: "words" });
      const draw = (all) => { ul.textContent = ""; (all ? words : words.slice(0, 4)).forEach((w) => ul.appendChild(el("li", null, [w.t, " ", el("small", null, nameOf(w.p))]))); };
      draw(false);
      box.appendChild(ul);
      if (words.length > 4) {
        let open = false;
        const more = el("button", { class: "btn quiet", type: "button", style: { padding: ".2rem .4rem", marginTop: ".3rem" } }, `Show all ${words.length}`);
        more.addEventListener("click", () => { open = !open; draw(open); more.textContent = open ? "Show fewer" : `Show all ${words.length}`; });
        box.appendChild(more);
      }
    }
    return box;
  }

  function productCard(profiles, stats) {
    const card = el("div", { class: "card og-product", id: "og-product" });
    card.appendChild(el("h3", null, "Product read"));
    card.appendChild(el("p", { class: "og-note" }, "Claude reads the anonymised results and gives a sober view on whether there is a product here, what shape it could take, and what the data does not yet support. It is an opinion to argue with, not an answer."));
    const actions = el("div", { class: "actions" });
    const out = el("div", { class: "out", "aria-live": "polite" });
    card.appendChild(actions); card.appendChild(out);
    const cached = jsonGet(LS.productRead);
    const renderRead = (res, meta) => {
      out.textContent = "";
      if (meta) out.appendChild(el("p", { class: "og-caption", style: { marginTop: "0" } }, `Based on ${plural(meta.n, "profile")}${meta.at ? ", read on " + String(meta.at).slice(0, 10) : ""}${meta.n !== profiles.length ? `. The view now has ${profiles.length}; ask again for a fresh read.` : "."}`));
      out.appendChild(el("p", { class: "verdict" }, String(res.verdict || "")));
      if (Array.isArray(res.demand) && res.demand.length) {
        out.appendChild(el("div", { class: "eyebrow" }, "What members said they would value"));
        out.appendChild(el("ul", null, res.demand.map((d) => el("li", null, String(d)))));
      }
      if (Array.isArray(res.options) && res.options.length) {
        out.appendChild(el("div", { class: "eyebrow" }, "Options"));
        out.appendChild(el("div", { class: "grid" }, res.options.map((o) => el("div", { class: "opt" }, [
          el("h4", null, String(o.name || "")),
          el("dl", null, [
            el("dt", null, "For whom"), el("dd", null, String(o.forWhom || "")),
            el("dt", null, "Shape"), el("dd", null, String(o.shape || "")),
            el("dt", null, "Evidence"), el("dd", null, String(o.evidence || "")),
            el("dt", null, "Risk"), el("dd", null, String(o.risk || "")),
          ]),
        ]))));
      }
      if (Array.isArray(res.notSupported) && res.notSupported.length) {
        out.appendChild(el("div", { class: "eyebrow" }, "Not supported by the data yet"));
        out.appendChild(el("ul", null, res.notSupported.map((d) => el("li", null, String(d)))));
      }
      if (res.nextTest) { out.appendChild(el("div", { class: "eyebrow" }, "Cheapest next test")); out.appendChild(el("p", null, String(res.nextTest))); }
    };
    const btn = el("button", { class: "btn primary", type: "button" }, cached ? "Ask Claude for a fresh product read" : "Ask Claude for a product read");
    const status = el("span", { class: "og-note" });
    actions.appendChild(btn); actions.appendChild(status);
    btn.addEventListener("click", async () => {
      if (!profiles.length) { status.textContent = "There are no profiles to read yet."; return; }
      btn.disabled = true; status.textContent = "Asking Claude, this takes about half a minute.";
      try {
        const res = await E().llm.json([{ role: "user", content: P().buildProductReadPrompt(profiles, stats) }], { tier: "complex" });
        const meta = { n: profiles.length, at: new Date().toISOString(), result: res };
        lsSet(LS.productRead, JSON.stringify(meta));
        renderRead(res, meta); status.textContent = ""; btn.textContent = "Ask Claude for a fresh product read";
      } catch (e) {
        status.textContent = "";
        out.appendChild(el("p", { class: "err" }, "Claude could not give a product read: " + (e && e.message ? e.message : String(e))));
      } finally { btn.disabled = false; }
    });
    if (cached && cached.result) renderRead(cached.result, cached);
    E().llm.init().then((mode) => {
      if (mode === "none") { btn.disabled = true; status.textContent = "Claude is not available in this view, so a new read cannot be requested here. " + (cached ? "The last read is shown below." : ""); }
    });
    return card;
  }

  function membersSection(profiles, openDetail) {
    const sorted = profiles.slice().sort((a, b) => levelOf(b) - levelOf(a) || a.member.name.localeCompare(b.member.name));
    const grid = el("div", { class: "og-members" });
    sorted.forEach((p) => {
      const lv = levelOf(p); const mean = meanOf(p);
      const card = el("button", { type: "button", class: "og-member", "data-id": p.id, on: { click: () => openDetail(p) } }, [
        el("div", { class: "name" }, [p.member.name, isSample(p) ? sampleTag() : null, p.endedEarly ? el("span", { class: "pill" }, "stopped early") : null, el("small", null, p.member.role)]),
        el("div", { class: "meta" }, [levelPill(lv), el("span", null, STANCE_LABEL[p.practice.stance] || p.practice.stance), el("span", { class: "mean", title: "Average confidence, 0 to 100" }, mean === null ? "no ratings" : mean + " / 100")]),
        el("div", { class: "meta" }, [kindPill(kindOf(p))]),
      ]);
      grid.appendChild(card);
    });
    const caption = el("p", { class: "og-caption" }, "Click a member to see their full profile: what they described, their ratings, what they want and could offer, and the feedback they received.");
    return sectionEl("members", "Members", `${plural(profiles.length, "profile")}, highest practice level first.`, el("div", null, [grid, caption]));
  }

  function importSection(rerender, profiles) {
    const S = window.Store;
    const ta = el("textarea", { class: "textarea", placeholder: "Paste a member's result code here", "aria-label": "Result code" });
    const msg = el("p", { class: "msg" });
    const importBtn = el("button", { class: "btn primary", type: "button" }, "Import");
    importBtn.addEventListener("click", async () => {
      const text = ta.value.trim();
      msg.className = "msg";
      if (!text) { msg.textContent = "Paste a result code first."; return; }
      if (!S || typeof S.importCode !== "function") { msg.className = "msg bad"; msg.textContent = "The shared store is not loaded in this page, so nothing can be imported."; return; }
      try {
        let r = S.importCode(text); if (r && typeof r.then === "function") r = await r;
        // Store.importCode returns {imported:[profiles], skipped}; tolerate a bare profile too.
        const list = (r && Array.isArray(r.imported)) ? r.imported : (r && r.member ? [r] : []);
        if (!list.length) throw new Error("no valid result code was found in the text" + (r && r.skipped ? ` (${r.skipped} skipped)` : ""));
        toast(list.length === 1 ? (list[0].member.name || "Result") + " imported" : `${list.length} results imported`);
        ta.value = "";
        await rerender({ scrollTo: "og-members" });
      } catch (e) { msg.className = "msg bad"; msg.textContent = "Could not import: " + (e && e.message ? e.message : String(e)); }
    });
    const copyBtn = el("button", { class: "btn", type: "button" }, "Copy all results as JSON");
    copyBtn.addEventListener("click", () => {
      const real = profiles.filter((p) => !isSample(p));
      copyText(JSON.stringify(real, null, 2), copyBtn);
      toast(real.length ? `${plural(real.length, "result")} copied (samples left out)` : "No real results yet; copied an empty list");
    });
    const removeWrap = el("span", { class: "confirm" });
    const removeBtn = el("button", { class: "btn", type: "button" }, "Remove local results");
    removeBtn.addEventListener("click", () => {
      removeWrap.textContent = "";
      removeWrap.appendChild(el("span", { class: "og-note" }, "Remove every result stored in this browser? Samples are not affected."));
      const yes = el("button", { class: "btn", type: "button", style: { color: "var(--bad)" } }, "Yes, remove them");
      const no = el("button", { class: "btn quiet", type: "button" }, "Keep them");
      yes.addEventListener("click", async () => {
        try {
          if (S && typeof S.clearLocal === "function") { let r = S.clearLocal(); if (r && r.then) await r; }
          else lsDel(LS.profiles);
          toast("Local results removed");
          await rerender({ scrollTo: "og-import" });
        } catch (e) { msg.className = "msg bad"; msg.textContent = "Could not remove: " + (e && e.message ? e.message : String(e)); }
      });
      no.addEventListener("click", () => { removeWrap.textContent = ""; removeWrap.appendChild(removeBtn); removeBtn.focus(); });
      removeWrap.appendChild(yes); removeWrap.appendChild(no); yes.focus();
    });
    removeWrap.appendChild(removeBtn);
    const body = el("div", { class: "og-import" }, [
      el("p", { class: "og-note" }, "When a member's result could not be saved to the shared store, they get a result code to send you. Paste it here to add them to this view."),
      ta,
      el("div", { class: "row" }, [importBtn, msg]),
      el("div", { class: "row" }, [copyBtn, removeWrap]),
    ]);
    return sectionEl("import", "Import results", "Add results by hand, or take everything out of this browser.", body);
  }

  function emptyState() {
    return el("div", { class: "og-empty" }, [
      el("h2", null, "No interviews yet"),
      el("p", { class: "og-note" }, "This page fills in as members complete the interview. Results arrive in two ways:"),
      el("ol", null, [
        el("li", null, "When a member is signed in, their result is saved to the shared store and shows up here on its own."),
        el("li", null, "Otherwise the member gets a result code at the end. They send it to you and you paste it under \"Import results\" below."),
      ]),
      el("p", { class: "og-note", style: { marginTop: ".75rem" } }, "Turn on \"Show sample members\" at the top to see what the page looks like with 16 fictional members."),
    ]);
  }

  // ---------------------------------------------------------------------------
  // Detail drawer
  // ---------------------------------------------------------------------------
  let drawerState = { open: false, lastFocus: null };
  function closeDetail() {
    const d = document.getElementById("og-drawer"); const b = document.getElementById("og-drawer-backdrop");
    if (d) d.remove(); if (b) b.remove();
    drawerState.open = false;
    if (drawerState.lastFocus && drawerState.lastFocus.focus) { try { drawerState.lastFocus.focus(); } catch (_) { /* ignore */ } }
  }
  function openDetail(p) {
    closeDetail();
    drawerState.lastFocus = document.activeElement;
    const lv = levelOf(p); const mean = meanOf(p);
    const sec = (title, children) => el("section", null, [el("h3", null, title)].concat(children));
    const D = P().DOMAINS;
    const closeBtn = el("button", { class: "btn quiet close", type: "button", "aria-label": "Close details", on: { click: closeDetail } }, "Close");
    const drawer = el("aside", { id: "og-drawer", class: "og-drawer", role: "dialog", "aria-modal": "true", "aria-label": "Details for " + p.member.name, tabindex: "-1" }, [
      el("div", { class: "top" }, [
        el("div", null, [el("h2", null, [p.member.name, " ", isSample(p) ? sampleTag() : null]), el("div", { class: "role" }, p.member.role + (p.member.org ? ", " + p.member.org : ""))]),
        closeBtn,
      ]),
      el("div", { class: "pills" }, [levelPill(lv), el("span", { class: "pill" }, "stance: " + (STANCE_LABEL[p.practice.stance] || p.practice.stance)), kindPill(kindOf(p)), p.endedEarly ? el("span", { class: "pill warn" }, "interview stopped early") : null, el("span", { class: "pill" }, "source: " + (p.source || "unknown"))]),
      quickQuestions(p),
      sec("Practice", [
        el("p", null, p.practice.summary || "No summary."),
        el("p", { class: "og-caption" }, `${levelLabel(lv)} (level ${lv}): ${(P().LADDER[lv] || {}).short || ""}`),
      ]),
      sec("Where they use AI", ((p.practice.domains || []).length || claimedOnly(p).length) ? (p.practice.domains || []).map((d) => {
        const dom = D.find((x) => x.key === d.key);
        return el("div", { class: "dom" }, [el("b", null, dom ? dom.label : d.key), el("span", null, d.evidence || "")]);
      }).concat(claimedOnly(p).map((k) => {
        const dom = D.find((x) => x.key === k);
        const probed = probedOnly(p).includes(k);
        return el("div", { class: "dom claim" + (probed ? " probed" : ""), "data-claim": k, "data-probed": probed ? "1" : "0" }, [el("b", null, dom ? dom.label : k), el("span", null, probed ? "Ticked this, and when asked gave no real example" : "Ticked in the quick questions; the conversation did not get to it")]);
      })) : [el("p", { class: "og-caption" }, "No kinds of work with evidence.")]),
      sec("Tools and judgement", [
        el("p", null, (p.practice.tools || []).length ? "Tools: " + p.practice.tools.join(", ") : "No tools named."),
        el("p", null, p.practice.judgement || "No judgement recorded."),
      ]),
      sec("Confidence ratings", confidenceBars(p, mean)),
      sec("What they want and could offer", [
        el("p", null, [el("b", null, "Wants: "), (p.wants || []).length ? p.wants.join("; ") : "nothing named"]),
        el("p", null, [el("b", null, "Could show others: "), (p.offers || []).length ? p.offers.join("; ") : "nothing named"]),
        el("p", null, [el("b", null, "Would pay for: "), p.productSignals.wouldPayFor || "nothing named"]),
        p.productSignals.quote ? el("blockquote", { class: "og-quote" }, "“" + p.productSignals.quote + "”") : null,
      ]),
      sec("What the member saw", [
        p.feedback.headline ? el("p", null, [el("b", null, p.feedback.headline)]) : null,
        p.feedback.summary ? el("p", null, p.feedback.summary) : null,
        (p.feedback.strengths || []).length ? el("ul", null, p.feedback.strengths.map((s) => el("li", null, s))) : null,
        (p.feedback.nextSteps || []).length ? el("ul", { style: { marginTop: ".4rem" } }, p.feedback.nextSteps.map((s) => el("li", null, [el("b", null, s.title + ": "), s.detail || ""]))) : null,
        p.feedback.closing ? el("p", { class: "og-caption" }, p.feedback.closing) : null,
        !(p.feedback.headline || p.feedback.summary) ? el("p", { class: "og-caption" }, "No feedback text stored.") : null,
      ]),
      sec("Quotes", (p.quotes || []).length ? p.quotes.map((q) => el("blockquote", { class: "og-quote" }, "“" + q + "”")) : [el("p", { class: "og-caption" }, "No quotes.")]),
      Array.isArray(p.transcript) && p.transcript.length ? sec("Transcript", [
        el("details", null, [
          el("summary", null, `Show the transcript (${plural(p.transcript.length, "turn")})`),
          el("div", { class: "og-transcript" }, p.transcript.map((t) => el("div", { class: "turn" }, [el("b", null, [t.role === "interviewer" ? "Interviewer" : p.member.name, t.tapped ? el("span", { class: "tap", title: "The member tapped a suggested reply instead of typing" }, "tapped quick reply") : null]), t.text]))),
        ]),
      ]) : null,
    ]);
    const backdrop = el("div", { id: "og-drawer-backdrop", class: "og-drawer-backdrop", on: { click: closeDetail } });
    document.body.appendChild(backdrop); document.body.appendChild(drawer);
    drawerState.open = true;
    drawer.addEventListener("keydown", (ev) => { if (ev.key === "Escape") closeDetail(); });
    closeBtn.focus();
  }
  /** The member's quick-question answers in plain words. */
  function quickQuestions(p) {
    const a = p.questionnaire;
    const head = el("h3", null, "Quick questions");
    if (!a) return el("section", { class: "og-qqsec" }, [head, el("p", { class: "og-caption" }, "Answered before the quick questions were added.")]);
    const skipped = (qid) => (P().questionSkipped ? P().questionSkipped(qid, a) : false);
    const rows = [];
    const add = (label, val) => { if (val) { rows.push(el("dt", null, label)); rows.push(el("dd", null, val)); } };
    const list = (qid, other) => { const v = Array.isArray(a[qid]) ? a[qid].map((k) => optLabel(qid, k)) : []; if (other) v.push(other); return v.join("; "); };
    add("How often", a.frequency ? optLabel("frequency", a.frequency) : "");
    if (!skipped("uses")) add("Used it for", list("uses") || "nothing ticked");
    if (!skipped("tools")) add("Tools", list("tools", a.toolsOther) || "none ticked");
    add("How they feel", a.stance ? optLabel("stance", a.stance) : "");
    add("Worth their time", list("offer", a.offerOther) || "nothing ticked");
    if (!skipped("pay")) add("Would pay", a.pay ? optLabel("pay", a.pay) : "not answered");
    if (!skipped("canShow")) add("Could show a colleague", a.canShow ? optLabel("canShow", a.canShow) : "not answered");
    return el("section", { class: "og-qqsec" }, [head, el("dl", { class: "og-qq" }, rows), el("p", { class: "og-caption" }, "Their own answers before the interview. Practice levels and the map come from the examples they gave, not from these ticks.")]);
  }

  function confidenceBars(p, mean) {
    const items = p.confidence.items || [];
    const out = [];
    out.push(el("p", { class: "og-caption", style: { marginTop: "0" } }, mean === null ? "No ratings were given." : `Average ${mean} out of 100. Each bar is how sure they were they can do that task now (0 = cannot do at all, 100 = highly certain).`));
    if (items.length) {
      out.push(el("div", { class: "og-bars" }, items.map((it) => {
        const v = Number.isFinite(it.rating) ? it.rating : null;
        return el("div", { class: "og-bar" }, [
          el("div", { class: "t" }, [el("span", { class: "lv", title: "Task difficulty on the practice ladder" }, "L" + it.level), el("span", null, it.task), (it.beyond !== undefined && BEYOND[it.beyond]) ? el("span", { class: "bey", title: "How this task compares with what they described doing" }, BEYOND[it.beyond]) : null]),
          el("div", { class: "track", role: "img", "aria-label": `rated ${v === null ? "skipped" : v}` }, [el("div", { class: "fill", style: { width: (v === null ? 0 : v) + "%" } })]),
          el("div", { class: "v" }, v === null ? "skipped" : v + " / 100"),
        ]);
      })));
    }
    if (p.confidence.pattern) out.push(el("p", { style: { marginTop: ".5rem" } }, p.confidence.pattern));
    if (p.divergence && p.divergence.note) out.push(el("p", { class: "og-caption" }, p.divergence.note));
    const Eng = E();
    if (items.length && typeof Eng.divergenceFor === "function") {
      try {
        const d = Eng.divergenceFor(levelOf(p), items);
        if (d && Number.isFinite(d.residual)) {
          const r = d.residual;
          const words = r === 0 ? "rated exactly what their tasks would predict" : `rated ${Math.abs(r)} ${Math.abs(r) === 1 ? "point" : "points"} ${r > 0 ? "above" : "below"} what their tasks would predict`;
          out.push(el("p", { class: "og-caption", "data-residual": String(r) }, `${p.member.name} ${words} (expected about ${d.expected}, given how far each rated task sits beyond their practice level).`));
        }
      } catch (_) { /* older engine */ }
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  async function render(container, opts) {
    try { return await renderInner(container, opts); }
    catch (e) {
      container.textContent = "";
      container.appendChild(el("div", { class: "notice bad" }, "The organiser view hit an error: " + (e && e.message ? e.message : String(e))));
      throw e;
    }
  }
  async function renderInner(container, opts) {
    opts = opts || {};
    ensureStyles();
    closeDetail();
    const profiles = await loadProfiles();
    const stats = E().stats(profiles);
    const rerender = (o) => render(container, o);
    const root = el("div", { class: "og-root", id: "og-root" });
    const toggle = el("input", { type: "checkbox", id: "og-samples" });
    toggle.checked = samplesOn();
    toggle.addEventListener("change", () => { setSamplesOn(toggle.checked); rerender(); });
    root.appendChild(el("div", { class: "og-head" }, [
      el("div", null, [
        el("div", { class: "eyebrow" }, "Organiser view"),
        el("h1", null, "AI at Work Diagnostic: the network"),
        el("p", { class: "lede" }, "Who in the network uses AI for what, where the gaps are, who could help whom, and whether there is something worth offering."),
      ]),
      el("label", { class: "og-toggle", for: "og-samples" }, [toggle, "Show sample members"]),
    ]));
    const seedN = Array.isArray(window.SEED) ? window.SEED.length : 0;
    if (samplesOn() && seedN) {
      root.appendChild(el("div", { class: "og-banner", id: "og-banner" }, [el("span", { class: "pill accent" }, "samples on"), el("span", null, `${seedN} fictional members are shown as samples so the view is not empty. Turn them off to see only real interviews.`)]));
    }
    if (!profiles.length) {
      root.appendChild(emptyState());
      root.appendChild(importSection(rerender, profiles));
    } else {
      root.appendChild(summarySection(profiles, stats));
      root.appendChild(scatterSection(profiles, openDetail));
      root.appendChild(heatmapSection(profiles, stats, openDetail));
      root.appendChild(helpSection(profiles, openDetail));
      root.appendChild(signalsSection(profiles, stats));
      root.appendChild(membersSection(profiles, openDetail));
      root.appendChild(importSection(rerender, profiles));
    }
    container.textContent = "";
    container.appendChild(root);
    if (opts.scrollTo) { const t = document.getElementById(opts.scrollTo); if (t && t.scrollIntoView) t.scrollIntoView({ block: "start" }); }
    return profiles;
  }

  window.OrganiserView = { render, drawSpreadBar, loadProfiles, samplesOn, setSamplesOn, openDetail, closeDetail, ensureStyles, el, svg, KIND_LABEL, DOMAIN_SHORT, LS };
})();
