import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data/judicial-catalog");
const records = JSON.parse(await readFile(path.join(dataDir, "processed/organismos.json"), "utf8"));
const manifest = JSON.parse(await readFile(path.join(dataDir, "sources/source-manifest.json"), "utf8"));
const sourceId = "source-consejo-magistratura-guiajudicial";
const now = new Date().toISOString();
const quote = (value) => value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
const numeric = (value) => Number.isFinite(value) ? String(value) : "NULL";
const idFor = (...parts) => `imp-${createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 24)}`;
const statements = [];

function insertBatches(table, columns, rows, batchSize = 100, conflictKey = "id") {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const values = rows.slice(offset, offset + batchSize).map((row) => `(${row.join(",")})`).join(",\n");
    const onConflict = conflictKey
      ? ` ON CONFLICT(${conflictKey}) DO UPDATE SET ${columns.filter((column) => column !== conflictKey).map((column) => `${column}=excluded.${column}`).join(",")}`
      : "";
    statements.push(`INSERT INTO ${table} (${columns.join(",")}) VALUES\n${values}${onConflict};`);
  }
}

const jurisdictionRows = [...new Set(records.map((record) => record.jurisdiction).filter(Boolean))].sort().map((name) => {
  const id = name.toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const code = name === "Nacional" ? "NAC" : name === "Federal" ? "FED" : "MIS";
  const level = name === "Nacional" || name === "Federal" ? "national" : "provincial";
  return [quote(id), quote(code), quote(name), quote(level), "NULL", quote(now), quote(now)];
});
insertBatches("jurisdictions", ["id", "code", "name", "level", "parent_id", "created_at", "updated_at"], jurisdictionRows);

statements.push(`INSERT INTO sources (id,name,publisher,source_url,format,license_name,terms_url,update_frequency,last_checked_at,last_imported_at,review_status,notes,created_at,updated_at) VALUES (${quote(sourceId)},${quote(manifest.name)},${quote("Consejo de la Magistratura de la Nación")},${quote(manifest.url)},'HTML público',NULL,${quote(manifest.url)},'revisión manual',${quote(manifest.retrievedAt)},${quote(now)},'pending','Extracción estructural reproducible; snapshot con clave de Maps redactada.',${quote(now)},${quote(now)}) ON CONFLICT(id) DO UPDATE SET name=excluded.name,publisher=excluded.publisher,source_url=excluded.source_url,format=excluded.format,terms_url=excluded.terms_url,last_checked_at=excluded.last_checked_at,last_imported_at=excluded.last_imported_at,notes=excluded.notes,updated_at=excluded.updated_at;`);

const bySourceId = new Map(records.filter((record) => record.sourceRecordId).map((record) => [record.sourceRecordId, record]));
const parentFor = (record) => record.sourceAncestorRecordIds?.slice().reverse().map((sourceRecordId) => bySourceId.get(sourceRecordId)).find(Boolean) || null;
const orgRows = records.map((record) => {
  const parent = parentFor(record);
  const jurisdictionId = record.jurisdiction?.toLocaleLowerCase("es-AR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || null;
  return [quote(record.id), quote(record.officialName), quote(record.organizationType), quote(record.branch), quote(record.instance), "NULL", quote(jurisdictionId), quote(record.jurisdiction === "Misiones" ? "MI" : null), quote(record.provinceName), "NULL", "NULL", quote(record.locality), "NULL", quote("active"), "NULL", numeric(record.coordinates.latitude), numeric(record.coordinates.longitude), quote(record.number), quote(record.sourceRecordId), quote(JSON.stringify(record.sourceHierarchy)), quote(JSON.stringify(record.missingFields)), quote(now), quote(now)];
});
insertBatches("organizations", ["id","official_name","organization_type","branch","instance","power","jurisdiction_id","province_code","province_name","region","judicial_district","locality","parent_organization_id","status","source_last_verified_at","latitude","longitude","catalog_number","source_record_id","source_hierarchy_json","missing_fields_json","created_at","updated_at"], orgRows);
for (const record of records) {
  const parent = parentFor(record);
  if (parent) statements.push(`UPDATE organizations SET parent_organization_id = ${quote(parent.id)} WHERE id = ${quote(record.id)};`);
}

const contacts = [];
const links = [];
const authorities = [];
const provenance = [];
const relations = [];
const searchRows = [];
for (const record of records) {
  for (const [type, value, details] of [["address",record.address,record.postalCode],["phone",record.phone,null],["email",record.email,null]]) {
    if (!value) continue;
    contacts.push([quote(idFor(record.id,type,value)),quote(record.id),quote(type),quote(type === "address" ? "Domicilio publicado" : type === "phone" ? "Teléfono publicado" : "Correo publicado"),quote(value),quote(details),quote(sourceId),"NULL","NULL","1"]);
  }
  for (const [type,label,url] of [["official_source","Guía Judicial",manifest.url],["map","Localizar en Google Maps",record.mapUrl]]) {
    links.push([quote(idFor(record.id,type,url)),quote(record.id),quote(type),quote(label),quote(url),quote(sourceId),"1"]);
  }
  record.officials.forEach((person,index) => {
    authorities.push([quote(idFor(record.id,person.name,person.role)),quote(record.id),quote(person.name),quote(person.role),"NULL","NULL",quote("listed_by_source"),quote(sourceId),quote(manifest.url),"NULL"]);
    provenance.push([quote(idFor(record.id,"officials",String(index))),quote("organization"),quote(record.id),quote(`officials[${index}]`),quote(sourceId),quote(manifest.url),quote(manifest.retrievedAt),"NULL","NULL",quote(`${record.sourceRecordId}:${index}`)]);
  });
  for (const field of ["officialName","address","phone","email","coordinates","sourceHierarchy"]) {
    if (record[field] == null || (Array.isArray(record[field]) && record[field].length === 0)) continue;
    provenance.push([quote(idFor(record.id,field)),quote("organization"),quote(record.id),quote(field),quote(sourceId),quote(manifest.url),quote(manifest.retrievedAt),"NULL","NULL",quote(record.sourceRecordId)]);
  }
  const parent = parentFor(record);
  if (parent) relations.push([quote(idFor(parent.id,record.id,"contains")),quote(parent.id),quote(record.id),quote("contains"),quote(manifest.retrievedAt),"NULL",quote(sourceId)]);
  const searchText = `${record.officialName} ${record.sourceHierarchy.join(" ")} ${record.number || ""} ${record.jurisdiction || ""} ${record.branch || ""} ${record.locality || ""} ${record.address || ""} ${record.phone || ""} ${record.email || ""} ${record.officials.map((person) => `${person.name} ${person.role}`).join(" ")}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR").trim();
  searchRows.push([quote(record.id),quote(searchText)]);
}
insertBatches("organization_contacts", ["id","organization_id","contact_type","label","value","details","source_id","valid_from","valid_to","is_current"], contacts);
insertBatches("organization_links", ["id","organization_id","link_type","label","url","source_id","is_current"], links);
insertBatches("organization_relations", ["id","from_organization_id","to_organization_id","relation_type","valid_from","valid_to","source_id"], relations);
insertBatches("authority_appointments", ["id","organization_id","person_name","role","started_on","ended_on","appointment_status","source_id","source_url","verified_at"], authorities);
insertBatches("field_provenance", ["id","entity_type","entity_id","field_path","source_id","source_url","retrieved_at","verified_at","source_license","source_record_key"], provenance);
statements.push("DELETE FROM organization_search;");
insertBatches("organization_search", ["organization_id","searchable_text"], searchRows, 100, null);

const sql = `${statements.join("\n\n")}\n`;
const output = path.join(dataDir, "processed/catalogo-judicial-d1-import.sql");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, sql, "utf8");
console.log(JSON.stringify({ output, bytes: Buffer.byteLength(sql), records: records.length, jurisdictions: jurisdictionRows.length, contacts: contacts.length, mapLinks: records.length, authorities: authorities.length, relations: relations.length, fieldProvenance: provenance.length, searchRecords: searchRows.length, statements: statements.length }, null, 2));
