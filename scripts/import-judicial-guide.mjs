import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceFile = path.join(root, "data/judicial-catalog/sources/consejo-magistratura-guiajudicial.html");
const outputDir = path.join(root, "data/judicial-catalog/processed");
const sourceUrl = "https://consejomagistratura.gov.ar/guiajudicial/";
const retrievedAt = "2026-10-11";
const html = await readFile(sourceFile, "utf8");
let sourceManifest = {};
try { sourceManifest = JSON.parse(await readFile(path.join(root, "data/judicial-catalog/sources/source-manifest.json"), "utf8")); } catch {}
const sourceHtmlSha256 = sourceManifest.originalSha256 || createHash("sha256").update(html).digest("hex");
const officialsPath = path.join(root, "data/judicial-catalog/sources/consejo-magistratura-integrantes.jsonl");
let officialsBySourceId = new Map();
try {
  const officialsLines = (await readFile(officialsPath, "utf8")).split(/\r?\n/).filter(Boolean);
  officialsBySourceId = new Map(officialsLines.map((line) => JSON.parse(line)).map((item) => [item.sourceRecordId, item.officials || []]));
} catch {}

function decode(value) {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function parseAttributes(source) {
  const attrs = {};
  for (const match of source.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

function parseHtml(source) {
  const document = { tag: "#document", attrs: {}, children: [], parent: null, text: "" };
  const stack = [document];
  const tokens = source.matchAll(/<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script\s*>|<style\b[\s\S]*?<\/style\s*>|<![^>]*>|<\/?[a-zA-Z][^>]*>|[^<]+/g);
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  for (const [token] of tokens) {
    if (token.startsWith("<!--") || token.startsWith("<!")) continue;
    if (/^<script\b|^<style\b/i.test(token)) continue;
    if (/^<\//.test(token)) {
      const tag = token.match(/^<\/\s*([\w:-]+)/)?.[1]?.toLowerCase();
      if (!tag) continue;
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    if (/^<[a-z]/i.test(token)) {
      const match = token.match(/^<\s*([\w:-]+)([\s\S]*?)\/?\s*>$/);
      if (!match) continue;
      const node = { tag: match[1].toLowerCase(), attrs: parseAttributes(match[2]), children: [], parent: stack.at(-1), text: "" };
      node.parent.children.push(node);
      if (!voidTags.has(node.tag) && !/\/\s*>$/.test(token)) stack.push(node);
      continue;
    }
    const value = decode(token);
    if (value.trim()) stack.at(-1).children.push({ tag: "#text", attrs: {}, children: [], parent: stack.at(-1), text: value });
  }
  return document;
}

function walk(node, predicate, output = []) {
  if (predicate(node)) output.push(node);
  for (const child of node.children) walk(child, predicate, output);
  return output;
}

function textContent(node) {
  if (node.tag === "#text") return node.text;
  return node.children.map(textContent).join(" ").replace(/\s+/g, " ").trim();
}

function classHas(node, name) { return (node.attrs.class || "").split(/\s+/).includes(name); }
function firstDescendant(node, predicate) { return walk(node, predicate, [])[0] || null; }
function ancestors(node) {
  const out = [];
  for (let current = node.parent; current; current = current.parent) out.push(current);
  return out;
}
function stableId(sourceRecordId, name) {
  const key = sourceRecordId || name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");
  return `cmn-${createHash("sha256").update(`consejo-magistratura:${key}`).digest("hex").slice(0, 20)}`;
}
function parseMarker(onclick) {
  const match = onclick.match(/marcador\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'/);
  if (!match) return null;
  return { latitude: Number(match[1]), longitude: Number(match[2]), name: match[3].replaceAll("\\'", "'"), markerAddress: match[4], markerPhone: match[5] };
}
function parsePeople(lines) {
  return lines.flatMap((line) => {
    const match = line.match(/^(.+?)\s+(Juez(?:a)?|Secretari[oa]|Prosecretari[oa]|Funcionari[oa]|Vocal|Presidente|Presidenta|Vicepresidente|Vicepresidenta|Consejero|Consejera|Ministro|Ministra)\b\s*(.*)$/i);
    return match ? [{ name: match[1].trim(), role: `${match[2]}${match[3] ? ` ${match[3].trim()}` : ""}`.trim() }] : [];
  });
}

const document = parseHtml(html);
const entries = walk(document, (node) => node.tag === "div" && classHas(node, "seccion") && node.attrs.onclick && node.attrs.onclick.includes("marcador("));
const hierarchyLabels = new Map(walk(document, (node) => node.tag === "div" && classHas(node, "seccion") && node.attrs.onclick && /cambie2?\(['"]\d+['"]\)/.test(node.attrs.onclick))
  .map((node) => [node.attrs.onclick.match(/cambie2?\(['"](\d+)['"]\)/)?.[1], textContent(node)])
  .filter(([id, name]) => id && name));
const provinces = ["Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán", "Ciudad Autónoma de Buenos Aires"];
const records = [];

for (const section of entries) {
  const marker = parseMarker(section.attrs.onclick);
  if (!marker) continue;
  const sectionName = textContent(section);
  const sourceRecordId = section.attrs.id?.replace(/^etiqueta/, "") || null;
  const container = ancestors(section).find((node) => classHas(node, "contenedor"));
  const contactBlock = container?.children.find((node) => node.tag === "div" && node.attrs.id === "direccion-tel") || null;
  const paragraph = contactBlock && firstDescendant(contactBlock, (node) => node.tag === "p");
  const contactLines = paragraph
    ? paragraph.children.map((child) => textContent(child)).filter(Boolean)
    : [];
  const address = contactLines[0] || marker.markerAddress || null;
  const email = contactLines.find((line) => /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/.test(line)) || null;
  const phone = contactLines.find((line) => /\d/.test(line) && line !== address) || marker.markerPhone || null;
  const sourceId = contactBlock && firstDescendant(contactBlock, (node) => node.tag === "a" && /consultaIntegrantes\(/.test(node.attrs.onclick || ""))?.attrs.onclick.match(/consultaIntegrantes\('([^']+)'\)/)?.[1] || null;
  const numericAncestors = ancestors(section).filter((node) => /^\d+$/.test(node.attrs.id || "")).reverse();
  const hierarchySections = numericAncestors.map((node) => hierarchyLabels.get(node.attrs.id)).filter(Boolean);
  const parentSourceId = numericAncestors.at(-1)?.attrs.id || null;
  const provinceName = provinces.find((name) => hierarchySections.some((item) => item.toLocaleLowerCase("es-AR").includes(name.toLocaleLowerCase("es-AR")))) || null;
  const personLines = contactLines.slice(1).filter((line) => !/\d/.test(line) && !/@/.test(line));
  const authorities = officialsBySourceId.get(sourceId) || parsePeople(personLines);
  const exactName = marker.name || sectionName;
  const postalCode = address?.match(/\b([A-Z]\d{4}[A-Z]{3}|[A-Z]\d{3}[A-Z]{3}|\d{4})\b/)?.[1] || null;
  const locality = hierarchySections.map((item) => item.match(/(?:Justicia (?:Federal|Nacional) de|Ciudad de)\s+(.+)$/i)?.[1]?.trim() || null).find(Boolean) || null;
  const number = exactName.match(/\b(?:Nro\.?|N[°º.]|N[úu]mero)\s*(\d+)/i)?.[1] || exactName.match(/\b(?:Sala|Secretar[ií]a)\s+(\d+)\b/i)?.[1] || null;
  const branch = /trabaj|laboral/i.test(exactName) ? "Trabajo" : /civil/i.test(exactName) ? "Civil" : /comercial/i.test(exactName) ? "Comercial" : /penal/i.test(exactName) ? "Penal" : /electoral/i.test(exactName) ? "Electoral" : null;
  const category = /juzgado/i.test(exactName) ? "court" : /c[aá]mara/i.test(exactName) ? "court" : /secretar[ií]a/i.test(exactName) ? "secretariat" : /tribunal|consejo|comisi[oó]n|escuela|jurado/i.test(exactName) ? "judicial_body" : "judicial_office";
  const jurisdiction = hierarchySections.some((item) => /Fueros Nacionales|Justicia Nacional/i.test(item)) ? "Nacional"
    : hierarchySections.some((item) => /Fueros Federales|Justicia Federal/i.test(item)) ? "Federal"
    : provinceName;
  records.push({
    id: stableId(sourceRecordId, exactName),
    officialName: exactName,
    sourceRecordId,
    sourceHierarchy: hierarchySections,
    number,
    jurisdiction,
    provinceName,
    branch,
    instance: null,
    organizationType: category,
    parentSourceRecordId: parentSourceId,
    sourceAncestorRecordIds: numericAncestors.map((node) => node.attrs.id),
    address,
    postalCode,
    locality,
    phone,
    email,
    coordinates: { latitude: marker.latitude, longitude: marker.longitude },
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${marker.latitude},${marker.longitude}`,
    officials: authorities,
    officialsLookup: sourceId ? { method: "public-site-dialog", sourceRecordId: sourceId, sourceUrl } : null,
    references: [{ type: "official_source", label: "Guía Judicial", url: sourceUrl }],
    missingFields: [...(!jurisdiction ? ["jurisdiction"] : []), "instance", ...(!address ? ["address"] : []), ...(!phone ? ["phone"] : []), ...(!email ? ["email"] : []), ...(authorities.length ? [] : ["officials"])],
    provenance: { sourceUrl, retrievedAt, sourceRecordId, sourceHtmlSha256 },
  });
}

const unique = new Map();
for (const record of records) {
  const current = unique.get(record.id);
  if (!current || Object.values(record).filter(Boolean).length > Object.values(current).filter(Boolean).length) unique.set(record.id, record);
}
const catalog = [...unique.values()].sort((a, b) => a.officialName.localeCompare(b.officialName, "es-AR"));
const searchable = catalog.map((record) => ({
  id: record.id,
  sourceRecordId: record.sourceRecordId,
  organization: record.officialName,
  number: record.number,
  jurisdiction: record.jurisdiction,
  branch: record.branch,
  locality: record.locality,
  address: record.address,
  normalized: `${record.officialName} ${record.sourceHierarchy.join(" ")} ${record.number || ""} ${record.jurisdiction || ""} ${record.branch || ""} ${record.locality || ""} ${record.address || ""} ${record.phone || ""} ${record.email || ""} ${record.officials.map((person) => `${person.name} ${person.role}`).join(" ")}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR").trim(),
}));
const summary = {
  source: { name: "Consejo de la Magistratura de la Nación — Guía Judicial", url: sourceUrl, retrievedAt, sourceHtmlSha256 },
  counts: {
    recordsImported: catalog.length,
    recordsWithAddress: catalog.filter((record) => record.address).length,
    recordsWithPhone: catalog.filter((record) => record.phone).length,
    recordsWithEmail: catalog.filter((record) => record.email).length,
  recordsWithCoordinates: catalog.filter((record) => Number.isFinite(record.coordinates.latitude) && Number.isFinite(record.coordinates.longitude)).length,
    recordsWithPublicOfficialsLookup: catalog.filter((record) => record.officialsLookup).length,
    recordsWithOfficials: catalog.filter((record) => record.officials.length).length,
    recordsWithoutReturnedOfficials: catalog.filter((record) => !record.officials.length).length,
    namedOfficials: catalog.reduce((count, record) => count + record.officials.length, 0),
  recordsWithJurisdiction: catalog.filter((record) => record.jurisdiction).length,
  recordsWithLocality: catalog.filter((record) => record.locality).length,
    incompleteRecords: catalog.filter((record) => record.missingFields.length).length,
    sourceSectionsWithIndividualMarkers: entries.length,
  },
  byJurisdiction: Object.fromEntries([...new Set(catalog.map((record) => record.jurisdiction).filter(Boolean))].sort().map((name) => [name, catalog.filter((record) => record.jurisdiction === name).length])),
  byOrganizationType: Object.fromEntries([...new Set(catalog.map((record) => record.organizationType))].sort().map((name) => [name, catalog.filter((record) => record.organizationType === name).length])),
  missingFieldCounts: Object.fromEntries([...new Set(catalog.flatMap((record) => record.missingFields))].sort().map((name) => [name, catalog.filter((record) => record.missingFields.includes(name)).length])),
  limitations: ["Los nombres y cargos se incorporaron desde el diálogo público Integrantes. En registros sin respuesta, el campo queda vacío.", "La Guía Judicial cubre organismos nacionales y federales publicados allí; no es un catálogo de todos los poderes judiciales provinciales.", "La copia del HTML tiene redactada la clave de Maps que la propia página expone en su etiqueta de script. El SHA-256 corresponde al documento recibido antes de redactarla."],
};

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "organismos.json"), `${JSON.stringify(catalog, null, 2)}\n`);
await writeFile(path.join(outputDir, "search-index.json"), `${JSON.stringify(searchable, null, 2)}\n`);
const jurisdictions = [...new Set(catalog.map((record) => record.jurisdiction).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es-AR")).map((name) => ({ id: name.toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), code: name === "Nacional" ? "NAC" : name === "Federal" ? "FED" : "PROV", name, level: name === "Nacional" || name === "Federal" ? "national" : "provincial" }));
await writeFile(path.join(outputDir, "jurisdicciones.json"), `${JSON.stringify(jurisdictions, null, 2)}\n`);
await writeFile(path.join(outputDir, "coverage.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
