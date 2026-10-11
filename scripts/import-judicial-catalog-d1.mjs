import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sqlPath = path.join(root, "data/judicial-catalog/processed/catalogo-judicial-d1-import.sql");
const configPath = path.join(root, "cloudflare/catalog-api/wrangler.toml");
const wranglerPath = path.join(root, "node_modules/wrangler/bin/wrangler.js");
const database = "catalogo-judicial-nacional";
const chunkLimit = 300_000;

function splitSql(source) {
  const statements = [];
  let start = 0;
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    if (source[index] === "'") {
      if (quoted && source[index + 1] === "'") { index++; continue; }
      quoted = !quoted;
    } else if (source[index] === ";" && !quoted) {
      const statement = source.slice(start, index + 1).trim();
      if (statement) statements.push(statement);
      start = index + 1;
    }
  }
  if (source.slice(start).trim()) throw new Error("El SQL termina con una sentencia incompleta.");
  return statements;
}

function groupStatements(statements) {
  const chunks = [];
  let chunk = [];
  let bytes = 0;
  for (const statement of statements) {
    const size = Buffer.byteLength(statement, "utf8") + 2;
    if (size > chunkLimit) throw new Error(`Una sentencia individual supera el límite de lote: ${size} bytes.`);
    if (bytes + size > chunkLimit && chunk.length) {
      chunks.push(chunk.join("\n\n") + "\n");
      chunk = [];
      bytes = 0;
    }
    chunk.push(statement);
    bytes += size;
  }
  if (chunk.length) chunks.push(chunk.join("\n\n") + "\n");
  return chunks;
}

if (!process.argv.includes("--confirm-remote")) {
  throw new Error("La carga remota requiere --confirm-remote explícito.");
}
const sql = await readFile(sqlPath, "utf8");
const chunks = groupStatements(splitSql(sql));
const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "bernabe-catalog-d1-"));
console.log(JSON.stringify({ statements: splitSql(sql).length, chunks: chunks.length, chunkLimitBytes: chunkLimit }));

try {
  for (let index = 0; index < chunks.length; index++) {
    const file = path.join(tempDirectory, `part-${String(index + 1).padStart(3, "0")}.sql`);
    await writeFile(file, chunks[index], "utf8");
    console.log(`Carga ${index + 1}/${chunks.length} (${Buffer.byteLength(chunks[index])} bytes)`);
    const result = spawnSync(process.execPath, [
      wranglerPath, "d1", "execute", database, "--remote", `--config=${configPath}`, `--file=${file}`,
    ], { cwd: root, stdio: "inherit", windowsHide: true });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Wrangler terminó con código ${result.status} al aplicar la parte ${index + 1}.`);
  }
  console.log("Importación D1 completada.");
  await rm(tempDirectory, { recursive: true, force: true });
} catch (error) {
  console.error(`La importación se detuvo. Los archivos de la carga quedaron en ${tempDirectory} para diagnóstico.`);
  throw error;
}
