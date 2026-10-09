#!/usr/bin/env node
// Mirrors https://bastian-schnitzler.github.io/lesson_prototype/ into ./mirror/.
//
// Everything downloaded is treated as untrusted data: files are only written
// to disk and scanned as text with regexes / JSON.parse. Nothing is executed.
//
// Usage: node scripts/mirror.mjs [baseUrl] [outDir]

import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = new URL(process.argv[2] ?? "https://bastian-schnitzler.github.io/lesson_prototype/");
const OUT = path.resolve(ROOT, process.argv[3] ?? "mirror");
const CONCURRENCY = 8;
const MAX_BYTES = 25 * 1024 * 1024;

const FILE_EXT =
  "json|js|mjs|css|html|woff2?|ttf|otf|eot|png|jpe?g|gif|svg|webp|avif|ico|mp3|ogg|wav|m4a|mp4|webm|txt|webmanifest";
const FILE_RE = new RegExp(`\\.(${FILE_EXT})$`, "i");

/** url -> { required, from } */
const queue = new Map();
/** url -> { path, bytes, status } */
const done = new Map();
const failures = [];

function toLocalPath(url) {
  const u = new URL(url);
  if (u.origin !== BASE.origin || !u.pathname.startsWith(BASE.pathname)) return null;
  let rel = decodeURIComponent(u.pathname.slice(BASE.pathname.length));
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  const abs = path.resolve(OUT, rel);
  // Refuse anything that would escape the output dir.
  if (!abs.startsWith(OUT + path.sep)) return null;
  return abs;
}

function enqueue(ref, relativeTo, { required, from }) {
  if (!ref || /^(data:|blob:|mailto:|javascript:|#)/i.test(ref)) return;
  let url;
  try {
    url = new URL(ref, relativeTo);
  } catch {
    return;
  }
  url.hash = "";
  url.search = "";
  const key = url.href;
  if (!toLocalPath(key)) return; // external or out-of-scope: ignore
  if (done.has(key)) return;
  const prev = queue.get(key);
  if (prev) {
    prev.required ||= required;
    return;
  }
  queue.set(key, { required, from });
}

// ---------- discovery (pure text scanning, never evaluation) ----------

function scanHtml(text, url) {
  for (const m of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi))
    enqueue(m[1], url, { required: true, from: url });
}

function scanCss(text, url) {
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi))
    enqueue(m[1], url, { required: true, from: url });
  for (const m of text.matchAll(/@import\s+["']([^"']+)["']/gi))
    enqueue(m[1], url, { required: true, from: url });
}

function scanJs(text, url) {
  // Any string literal ('', "", ``) that looks like a relative file path.
  const lit = /(["'`])((?:\.{0,2}\/)?[\w@~.\-]+(?:\/[\w@~.\-]+)*\.(?:FILE_EXT))\1/gi;
  const re = new RegExp(lit.source.replace("FILE_EXT", FILE_EXT), "gi");
  for (const m of text.matchAll(re)) {
    const ref = m[2];
    if (ref.includes("${")) continue;
    // Vite emits "./chunk.js" relative to the importing module, and
    // "assets/x" / "content/x" relative to the document base.
    const relTo = ref.startsWith("./") || ref.startsWith("../") ? url : BASE.href;
    enqueue(ref, relTo, { required: false, from: url });
  }
}

function scanJson(text, url) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    failures.push({ url, error: `invalid JSON: ${e.message}` });
    return;
  }
  const walk = (v, key) => {
    if (typeof v === "string") {
      // Manifest URLs (url, outlineUrl, ...) are fetched relative to the page.
      const isUrlKey = /url$/i.test(key ?? "");
      if ((isUrlKey || FILE_RE.test(v)) && !/\s/.test(v) && v.length < 300)
        enqueue(v, BASE.href, { required: isUrlKey, from: url });
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(data);
}

// ---------- download ----------

async function download(url, meta) {
  const local = toLocalPath(url);
  let res;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch (e) {
    return { ok: false, error: e.message };
  }
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) return { ok: false, error: `too large (${len} bytes)` };
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) return { ok: false, error: `too large (${buf.length} bytes)` };
  await mkdir(path.dirname(local), { recursive: true });
  await writeFile(local, buf);

  const type = res.headers.get("content-type") ?? "";
  const ext = path.extname(local).toLowerCase();
  const text = () => buf.toString("utf8");
  if (ext === ".html" || type.includes("text/html")) scanHtml(text(), url);
  else if (ext === ".css") scanCss(text(), url);
  else if (ext === ".js" || ext === ".mjs") scanJs(text(), url);
  else if (ext === ".json" || ext === ".webmanifest") scanJson(text(), url);
  return { ok: true, local, bytes: buf.length };
}

async function run() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  enqueue("./", BASE.href, { required: true, from: "(entry)" });
  enqueue("content/manifest.json", BASE.href, { required: true, from: "(entry)" });

  const optionalMisses = [];
  while (queue.size) {
    const batch = [...queue.entries()].slice(0, CONCURRENCY);
    for (const [u] of batch) queue.delete(u);
    await Promise.all(
      batch.map(async ([url, meta]) => {
        const r = await download(url, meta);
        done.set(url, r);
        if (!r.ok) (meta.required ? failures : optionalMisses).push({ url, error: r.error, from: meta.from });
        else console.log(`  ✓ ${path.relative(OUT, r.local)} (${r.bytes} B)`);
      }),
    );
  }

  const ok = [...done.values()].filter((r) => r.ok);
  const totalBytes = ok.reduce((s, r) => s + r.bytes, 0);
  const byDir = {};
  for (const r of ok) {
    const d = path.dirname(path.relative(OUT, r.local));
    byDir[d] = (byDir[d] ?? 0) + 1;
  }
  const report = {
    base: BASE.href,
    date: new Date().toISOString(),
    files: ok.length,
    bytes: totalBytes,
    byDir,
    failures,
    optionalMisses,
  };
  await writeFile(path.join(ROOT, "mirror-report.json"), JSON.stringify(report, null, 2) + "\n");

  console.log("\n=== Mirror report ===");
  console.log(`Files:  ${ok.length}`);
  console.log(`Size:   ${(totalBytes / 1024).toFixed(1)} KiB`);
  for (const [d, n] of Object.entries(byDir).sort()) console.log(`        ${d.padEnd(20)} ${n}`);
  console.log(`Failed (required): ${failures.length}`);
  for (const f of failures) console.log(`  ✗ ${f.url} — ${f.error}${f.from ? ` (from ${f.from})` : ""}`);
  console.log(`Not found (heuristic candidates from JS/JSON): ${optionalMisses.length}`);
  for (const f of optionalMisses) console.log(`  · ${f.url} — ${f.error}`);
  process.exitCode = failures.length ? 1 : 0;
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
