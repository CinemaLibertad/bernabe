import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data/judicial-catalog");
const recordsPath = path.join(dataDir, "processed/organismos.json");
const rawPath = path.join(dataDir, "sources/consejo-magistratura-integrantes.jsonl");
const endpoint = "https://consejomagistratura.gov.ar/guiajudicial/integrantes.php";
const sourceUrl = "https://consejomagistratura.gov.ar/guiajudicial/";
const retrievedAt = new Date().toISOString();
const records = JSON.parse(await readFile(recordsPath, "utf8"));
const targets = records.filter((record) => record.officialsLookup?.sourceRecordId);
const refresh = process.argv.includes("--refresh");
const completed = new Map();
let next = 0;
let requestCount = 0;
const concurrency = 3;
const delayMs = 350;

function decode(text) {
  return text.replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&#x([\da-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)));
}

function parseOfficials(markup) {
  return [...markup.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p\s*>/gi)].map((match) => {
    const plain = decode(match[1].replace(/<br\s*\/?\s*>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    const split = plain.split(/\s*\|\s*/);
    if (split.length < 2) return null;
    return { name: split[0].trim(), role: split.slice(1).join(" | ").trim() };
  }).filter((person) => person?.name && person.role);
}

await mkdir(path.dirname(rawPath), { recursive: true });
try {
  if (!refresh) {
    const previous = (await readFile(rawPath, "utf8")).split(/\r?\n/).filter(Boolean);
    for (const line of previous) {
      try {
        const item = JSON.parse(line);
        if (item.sourceRecordId) completed.set(item.sourceRecordId, item);
      } catch { /* Ignore an incomplete final JSONL line; it will be fetched again. */ }
    }
  }
} catch {}
if (refresh) await writeFile(rawPath, "", "utf8");
const pendingTargets = targets.filter((record) => {
  const prior = completed.get(record.officialsLookup.sourceRecordId);
  return !prior || prior.error || prior.status < 200 || prior.status >= 300;
});

async function worker() {
  while (next < pendingTargets.length) {
    const index = next++;
    const record = pendingTargets[index];
    const id = record.officialsLookup.sourceRecordId;
    let result;
    let error = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Bernabe-Judicial-Catalog/1.0 (public directory import)" },
          body: new URLSearchParams({ id }),
          signal: AbortSignal.timeout(20_000),
        });
        const html = await response.text();
        result = { sourceRecordId: id, status: response.status, sourceUrl, retrievedAt: new Date().toISOString(), html, officials: response.ok ? parseOfficials(html) : [] };
        if (response.status === 429 || response.status >= 500) throw new Error(`HTTP ${response.status}`);
        error = null;
        break;
      } catch (cause) {
        error = String(cause?.message || cause);
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    result ||= { sourceRecordId: id, status: 0, sourceUrl, retrievedAt: new Date().toISOString(), html: "", officials: [], error };
    completed.set(id, result);
    await appendFile(rawPath, `${JSON.stringify(result)}\n`, "utf8");
    requestCount++;
    if (requestCount % 50 === 0 || requestCount === pendingTargets.length) {
      for (const item of records) {
        const fetched = completed.get(item.officialsLookup?.sourceRecordId);
        if (fetched) item.officials = fetched.officials;
      }
      await writeFile(recordsPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
      console.log(JSON.stringify({ requestedThisRun: requestCount, remainingThisRun: pendingTargets.length, successfulLookups: [...completed.values()].filter((item) => item.status >= 200 && item.status < 300).length, withOfficials: [...completed.values()].filter((item) => item.officials?.length).length, unavailable: [...completed.values()].filter((item) => item.error || item.status >= 400).length }));
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, pendingTargets.length) }, worker));
for (const item of records) {
  const fetched = completed.get(item.officialsLookup?.sourceRecordId);
  if (fetched) item.officials = fetched.officials || [];
}
await writeFile(recordsPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ requestedThisRun: requestCount, remainingThisRun: pendingTargets.length, successfulLookups: [...completed.values()].filter((item) => item.status >= 200 && item.status < 300).length, withOfficials: [...completed.values()].filter((item) => item.officials?.length).length, unavailable: [...completed.values()].filter((item) => item.error || item.status >= 400).length }));
