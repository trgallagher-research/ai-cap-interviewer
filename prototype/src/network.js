/* network.js — the share-back page the organiser sends to the whole network.
 *
 * Defines ONE global: window.NetworkView. Depends on Prompts, Engine, OrganiserView (shared data
 * loading, the practice-spread bar and the DOM helpers) and the App.ui helpers from index.html.
 * The generated text lives in localStorage "aiwd.shareback" and every block is editable in place.
 */
(function () {
  "use strict";
  const LS_KEY = "aiwd.shareback";
  const OV = () => window.OrganiserView;
  const P = () => window.Prompts;
  const E = () => window.Engine;

  const CSS = `
.nw-root { max-width: 44rem; margin: 0 auto; padding: 0 0 3rem; color: var(--fg); font-family: var(--font-body); line-height: 1.55; }
.nw-root h1, .nw-root h2 { font-family: var(--font-display); font-weight: 500; margin: 0; }
.nw-root h1 { font-size: 1.9rem; line-height: 1.2; }
.nw-root h2 { font-size: 1.25rem; margin: 1.75rem 0 .5rem; }
.nw-root h3 { font-size: 1rem; font-weight: 600; margin: 0 0 .2rem; }
.nw-root p { margin: 0 0 .75rem; }
.nw-notice { background: var(--accent-soft); color: var(--fg); border-radius: var(--radius); padding: .65rem .9rem; font-size: .9rem; margin: 1.25rem 0 1rem; }
.nw-tools { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin: 0 0 1.5rem; }
.nw-tools .status { font-size: .9rem; color: var(--fg-2); }
.nw-tools .err { color: var(--bad); font-size: .9rem; }
.nw-meta { color: var(--muted); font-size: .85rem; margin: .25rem 0 1rem; }
.nw-block { border-radius: var(--radius); }
.nw-root.editing .nw-block[contenteditable="true"] { outline: 1px dashed var(--accent); outline-offset: 3px; background: var(--surface); }
.nw-root.editing .nw-block[contenteditable="true"]:focus { outline: 2px solid var(--accent); }
.nw-editnote { font-size: .85rem; color: var(--fg-2); background: var(--surface-2); border-radius: var(--radius); padding: .5rem .75rem; margin: 0 0 1rem; }
.nw-quote { border-left: 3px solid var(--accent); padding: .25rem 0 .25rem .9rem; margin: 0 0 .9rem; font-family: var(--font-display); font-size: 1.1rem; font-style: italic; color: var(--fg-2); }
.nw-item { margin: 0 0 .9rem; }
.nw-help { display: grid; gap: .6rem; margin: 0 0 .75rem; }
.nw-help .row { display: grid; grid-template-columns: 1fr; gap: .15rem; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: .6rem .8rem; }
.nw-help .row .need { font-weight: 600; }
.nw-help .row .who { color: var(--fg-2); }
.nw-help .row .who::before { content: "Who can help: "; color: var(--muted); font-size: .85rem; }
.nw-try { counter-reset: try; display: grid; gap: .6rem; margin: 0 0 .75rem; }
.nw-try .row { display: grid; grid-template-columns: 2rem 1fr; gap: .5rem; align-items: start; }
.nw-try .row::before { counter-increment: try; content: counter(try); font-family: var(--font-display); font-size: 1.5rem; color: var(--accent); line-height: 1; }
.nw-spread { margin: .75rem 0 1rem; }
.nw-empty { background: var(--surface); border: 1px dashed var(--line); border-radius: var(--radius-lg); padding: 1.5rem; margin: 1rem 0; }
.nw-empty h2 { margin: 0 0 .5rem; }
.nw-empty p { color: var(--fg-2); }
.nw-empty .actions { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-top: .75rem; }
.nw-closing { border-top: 1px solid var(--line); padding-top: 1rem; margin-top: 1.5rem; }
@media (max-width: 640px) { .nw-root h1 { font-size: 1.5rem; } }
`;
  function ensureStyles() {
    OV().ensureStyles();
    if (document.getElementById("nw-styles")) return;
    const s = document.createElement("style"); s.id = "nw-styles"; s.textContent = CSS; document.head.appendChild(s);
  }
  function el() { return OV().el.apply(null, arguments); }
  function ui() { return (window.App && window.App.ui) || {}; }
  function toast(m) { if (ui().toast) ui().toast(m); }
  function copyText(t, b) { if (ui().copy) return ui().copy(t, b); try { navigator.clipboard.writeText(t); } catch (_) { /* ignore */ } if (b) { const o = b.textContent; b.textContent = "Copied"; setTimeout(() => { b.textContent = o; }, 2000); } }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* ignore */ } }
  function loadCache() { const raw = lsGet(LS_KEY); if (!raw) return null; try { const o = JSON.parse(raw); return o && o.data ? o : null; } catch (_) { return null; } }
  function saveCache(c) { lsSet(LS_KEY, JSON.stringify(c)); }

  /** Make sure the generated object has every field the page renders, as the right type. */
  function normalise(d) {
    d = d || {};
    const str = (v, dflt) => (typeof v === "string" && v.trim()) ? v : (dflt || "");
    const arr = (v) => Array.isArray(v) ? v : [];
    return {
      title: str(d.title, "What we learned about AI in our work"),
      intro: str(d.intro),
      picture: str(d.picture),
      findings: arr(d.findings).map((f) => ({ title: str(f && f.title), detail: str(f && f.detail) })),
      quotes: arr(d.quotes).map((q) => str(q)).filter(Boolean),
      helpMap: arr(d.helpMap).map((h) => ({ need: str(h && h.need), whoCanHelp: str(h && h.whoCanHelp) })),
      tryThisWeek: arr(d.tryThisWeek).map((t) => ({ title: str(t && t.title), detail: str(t && t.detail) })),
      closing: str(d.closing),
    };
  }

  function toText(d) {
    const L = [];
    L.push("# " + d.title, "");
    if (d.intro) L.push(d.intro, "");
    if (d.picture) L.push("## The picture", "", d.picture, "");
    if (d.findings.length) { L.push("## What stood out", ""); d.findings.forEach((f) => L.push("**" + f.title + "**", f.detail, "")); }
    if (d.quotes.length) { L.push("## In our own words", ""); d.quotes.forEach((q) => L.push("> " + q, "")); }
    if (d.helpMap.length) { L.push("## Who can help with what", ""); d.helpMap.forEach((h) => L.push("- " + h.need + ": " + h.whoCanHelp)); L.push(""); }
    if (d.tryThisWeek.length) { L.push("## Three things to try this week", ""); d.tryThisWeek.forEach((t, i) => L.push((i + 1) + ". **" + t.title + "** " + t.detail)); L.push(""); }
    if (d.closing) L.push("## What happens next", "", d.closing, "");
    return L.join("\n").trim() + "\n";
  }

  async function generate(profiles) {
    const stats = E().stats(profiles);
    const res = await E().llm.json([{ role: "user", content: P().buildSharebackPrompt(profiles, stats) }], { tier: "complex" });
    return normalise(res);
  }

  async function render(container) {
    try { return await renderInner(container); }
    catch (e) {
      container.textContent = "";
      container.appendChild(el("div", { class: "notice bad" }, "The share-back view hit an error: " + (e && e.message ? e.message : String(e))));
      throw e;
    }
  }
  async function renderInner(container) {
    ensureStyles();
    const profiles = await OV().loadProfiles();
    const stats = E().stats(profiles);
    const sampleN = profiles.filter((p) => p.source === "seed").length;
    let cache = loadCache();
    let editing = false;
    const root = el("div", { class: "nw-root", id: "nw-root" });
    container.textContent = "";
    container.appendChild(root);

    const mode = await E().llm.init();
    const llmOk = mode !== "none";

    function head(extraTools) {
      root.appendChild(el("div", { class: "eyebrow" }, "Share-back page"));
      root.appendChild(el("div", { class: "nw-notice" }, "Written by Claude from the anonymised results; read and edit before you send it."));
      const tools = el("div", { class: "nw-tools" }, extraTools);
      root.appendChild(tools);
      return tools;
    }

    async function runGenerate(status, btns) {
      if (!profiles.length) { status.textContent = "There are no interviews to write from yet."; return; }
      btns.forEach((b) => { b.disabled = true; });
      status.className = "status"; status.textContent = "Asking Claude to write the page, this takes about half a minute.";
      try {
        const data = await generate(profiles);
        cache = { n: profiles.length, samples: sampleN, at: new Date().toISOString(), data };
        saveCache(cache);
        toast("Share-back written");
        render(container);
      } catch (e) {
        status.className = "err"; status.textContent = "Claude could not write the page: " + (e && e.message ? e.message : String(e));
        btns.forEach((b) => { b.disabled = false; });
      }
    }

    if (!cache) {
      const status = el("span", { class: "status" });
      const btn = el("button", { class: "btn primary", type: "button", id: "nw-generate" }, "Generate share-back with Claude");
      btn.addEventListener("click", () => runGenerate(status, [btn]));
      head([]);
      const empty = el("div", { class: "nw-empty" }, [
        el("h2", null, "Nothing written yet"),
        el("p", null, `Claude will write a short page for the members from the ${profiles.length ? profiles.length + " " : ""}anonymised results: the overall picture, a few findings, quotes, who can help with what, and three things to try this week. You can then edit every line before sending it.`),
        sampleN ? el("p", null, `${sampleN} of the ${profiles.length} profiles are fictional samples. Turn samples off in the organiser view if you want a page from real interviews only.`) : null,
        el("div", { class: "actions" }, [btn, status]),
      ]);
      if (!llmOk) { btn.disabled = true; status.textContent = "Claude is not available in this view, so the page cannot be written here."; }
      if (!profiles.length) { btn.disabled = true; status.textContent = "No interviews yet. The page can be written once members have taken part."; }
      root.appendChild(empty);
      return;
    }

    // At rest: render the cached page.
    const d = cache.data;
    const status = el("span", { class: "status" });
    const editBtn = el("button", { class: "btn", type: "button", id: "nw-edit", "aria-pressed": "false" }, "Edit");
    const copyBtn = el("button", { class: "btn", type: "button", id: "nw-copy" }, "Copy as text");
    const regenBtn = el("button", { class: "btn", type: "button", id: "nw-regen" }, "Regenerate");
    head([editBtn, copyBtn, regenBtn, status]);
    if (!llmOk) { regenBtn.disabled = true; regenBtn.title = "Claude is not available in this view"; }
    copyBtn.addEventListener("click", () => { copyText(toText(cache.data), copyBtn); toast("Share-back copied as text"); });
    regenBtn.addEventListener("click", () => runGenerate(status, [regenBtn]));

    const editNote = el("div", { class: "nw-editnote", hidden: true }, "You are editing. Click into any text to change it; changes are saved as you go. Click \"Done editing\" when you are finished.");
    root.appendChild(editNote);
    root.appendChild(el("div", { class: "nw-meta" }, `Written from ${cache.n} ${cache.n === 1 ? "profile" : "profiles"}${cache.samples ? " (" + cache.samples + " of them samples)" : ""} on ${String(cache.at || "").slice(0, 10)}.${cache.n !== profiles.length ? " The data has changed since; regenerate for a fresh page." : ""}`));

    // Editable text block: path addresses the field inside cache.data.
    function block(tag, cls, get, set, placeholder) {
      const node = el(tag, { class: (cls ? cls + " " : "") + "nw-block", "data-editable": "" }, get() || placeholder || "");
      node.addEventListener("input", () => { set(node.textContent); saveCache(cache); });
      node.addEventListener("blur", () => { set(node.textContent.trim()); saveCache(cache); });
      return node;
    }
    root.appendChild(block("h1", "", () => d.title, (v) => { d.title = v; }));
    root.appendChild(block("p", "", () => d.intro, (v) => { d.intro = v; }));
    root.appendChild(el("h2", null, "The picture"));
    const spread = el("div", { class: "nw-spread", id: "nw-spread" }, [OV().drawSpreadBar(stats)]);
    root.appendChild(spread);
    root.appendChild(block("p", "", () => d.picture, (v) => { d.picture = v; }));
    if (d.findings.length) {
      root.appendChild(el("h2", null, "What stood out"));
      d.findings.forEach((f) => root.appendChild(el("div", { class: "nw-item" }, [block("h3", "", () => f.title, (v) => { f.title = v; }), block("p", "", () => f.detail, (v) => { f.detail = v; })])));
    }
    if (d.quotes.length) {
      root.appendChild(el("h2", null, "In our own words"));
      d.quotes.forEach((q, i) => root.appendChild(block("blockquote", "nw-quote", () => d.quotes[i], (v) => { d.quotes[i] = v; })));
    }
    if (d.helpMap.length) {
      root.appendChild(el("h2", null, "Who can help with what"));
      root.appendChild(el("div", { class: "nw-help" }, d.helpMap.map((h) => el("div", { class: "row" }, [block("div", "need", () => h.need, (v) => { h.need = v; }), block("div", "who", () => h.whoCanHelp, (v) => { h.whoCanHelp = v; })]))));
    }
    if (d.tryThisWeek.length) {
      root.appendChild(el("h2", null, "Three things to try this week"));
      root.appendChild(el("div", { class: "nw-try" }, d.tryThisWeek.map((t) => el("div", { class: "row" }, [el("div", null, [block("h3", "", () => t.title, (v) => { t.title = v; }), block("p", "", () => t.detail, (v) => { t.detail = v; })])]))));
    }
    root.appendChild(el("div", { class: "nw-closing" }, [el("h2", { style: { marginTop: "0" } }, "What happens next"), block("p", "", () => d.closing, (v) => { d.closing = v; })]));

    function setEditing(on) {
      editing = on;
      root.classList.toggle("editing", on);
      editBtn.textContent = on ? "Done editing" : "Edit";
      editBtn.setAttribute("aria-pressed", on ? "true" : "false");
      editNote.hidden = !on;
      root.querySelectorAll("[data-editable]").forEach((n) => { if (on) n.setAttribute("contenteditable", "true"); else n.removeAttribute("contenteditable"); });
      if (on) { const first = root.querySelector("[data-editable]"); if (first) first.focus(); }
      else { saveCache(cache); toast("Edits saved"); }
    }
    editBtn.addEventListener("click", () => setEditing(!editing));
  }

  window.NetworkView = { render, toText, normalise, LS_KEY };
})();
