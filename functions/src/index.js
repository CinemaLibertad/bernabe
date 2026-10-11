const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const juridicaApiKey = defineSecret("JURIDICA_API_KEY");
const allowedEmail = "sebastiancharpentier@gmail.com";
const officialHosts = ["saij.gob.ar", "csjn.gov.ar", "scba.gov.ar"];
const acceptedSearchTypes = new Set(["jurisprudencia", "fallo", "sumario", "legislacion", "ley", "decreto", "doctrina", "dictamen", "todo"]);
let toolSchemaCache = null;

function optionalString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeSource(value) {
  if (typeof value !== "string") return null;
  const source = value.toLowerCase();
  if (source.includes("saij")) return "SAIJ";
  if (source.includes("csjn") || source.includes("corte suprema de justicia de la nación")) return "CSJN";
  if (source.includes("juba") || source.includes("buenos aires") || source.includes("scba")) return "JUBA";
  return null;
}

function officialUrl(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const isOfficial = url.protocol === "https:" && officialHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
    return isOfficial ? url.toString() : null;
  } catch { return null; }
}

function normalizeResult(item) {
  item = item && typeof item === "object" ? item : {};
  const source = [item.source, item.fuente, item.sourceName, item.source_name, item.database, item.base]
    .map((value) => value && typeof value === "object" ? value.name || value.title || value.id : value)
    .map((value) => normalizeSource(value)).find(Boolean) || null;
  return {
    providerId: optionalString(item.uuid, item.id, item.caseId, item.case_id, item.falloId, item.fallo_id, item.identifier),
    source,
    type: optionalString(item.type, item.tipo, item.documentType, item.document_type),
    title: optionalString(item.title, item.titulo, item.caratula, item.caption),
    caption: optionalString(item.caratula, item.caption, item.title, item.titulo),
    court: optionalString(item.court, item.tribunal, item.courtName, item.court_name),
    decisionDate: optionalString(item.decisionDate, item.decision_date, item.fecha, item.date),
    jurisdiction: optionalString(item.jurisdiction, item.jurisdiccion, item.jurisdictionName),
    text: optionalString(item.fullText, item.full_text, item.text, item.texto, item.content, item.sumario, item.excerpt, item.snippet),
    officialUrl: officialUrl(item.officialUrl || item.official_url || item.sourceUrl || item.source_url || item.url || item.link),
  };
}

function parseResponseBody(text) {
  if (!text) return null;
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch { /* Streamable HTTP may wrap JSON-RPC in SSE. */ }
  const dataLines = trimmed.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim());
  for (const line of dataLines.reverse()) {
    try { return JSON.parse(line); } catch { /* Ignore non-JSON keepalive frames. */ }
  }
  return null;
}

async function postMcp(body, apiKey, sessionId) {
  let response;
  try {
    response = await fetch("https://juridica.ar/mcp", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(body.method === "initialize" ? {} : { "MCP-Protocol-Version": "2025-11-25" }),
        ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(9000),
    });
  } catch {
    throw new HttpsError("unavailable", "No se pudo conectar con el servicio de jurisprudencia.");
  }
  const responseSession = response.headers.get("Mcp-Session-Id") || sessionId || null;
  const text = response.status === 202 ? "" : await response.text();
  const parsed = parseResponseBody(text);
  if (!response.ok) {
    const status = response.status === 401 ? "La clave del proveedor fue rechazada." : response.status === 429 ? "Se alcanzó el límite diario del proveedor." : "El proveedor no pudo completar la consulta.";
    throw new HttpsError(response.status === 401 ? "failed-precondition" : response.status === 429 ? "resource-exhausted" : "unavailable", status);
  }
  return { data: parsed, sessionId: responseSession };
}

async function connectMcp(apiKey) {
  const initialized = await postMcp({
    jsonrpc: "2.0", id: 1, method: "initialize",
    params: {
      protocolVersion: "2025-11-25", capabilities: {},
      clientInfo: { name: "bernabe-estudio-juridico", version: "0.1.0" },
    },
  }, apiKey, null);
  if (initialized.data?.error) throw new HttpsError("unavailable", "No se pudo iniciar la conexión de búsqueda jurídica.");

  await postMcp({ jsonrpc: "2.0", method: "notifications/initialized" }, apiKey, initialized.sessionId);

  if (!toolSchemaCache) {
    const listed = await postMcp({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, apiKey, initialized.sessionId);
    const tools = listed.data?.result?.tools;
    if (!Array.isArray(tools)) throw new HttpsError("data-loss", "El proveedor no devolvió el contrato de herramientas esperado.");
    toolSchemaCache = tools;
  }
  return initialized.sessionId;
}

function makeSearchArguments(tool, query, type, offset) {
  const schema = tool.inputSchema || {};
  const properties = schema.properties || {};
  const required = Array.isArray(schema.required) ? schema.required : [];
  const args = {};
  const names = Object.keys(properties);
  const queryName = names.find((name) => ["query", "q", "search", "searchQuery", "search_query", "term", "terms", "text", "texto", "busqueda"].includes(name.toLowerCase()))
    || required.find((name) => properties[name]?.type === "string");
  if (!queryName) throw new HttpsError("failed-precondition", "El contrato de búsqueda del proveedor cambió y requiere adaptación.");
  args[queryName] = query;

  const sourceName = names.find((name) => ["sources", "source", "fuentes", "fuente"].includes(name.toLowerCase()));
  if (sourceName) {
    const property = properties[sourceName];
    const enumValues = property.items?.enum || property.enum || [];
    const available = enumValues.length ? enumValues : ["SAIJ", "CSJN", "JUBA"];
    const all = available.filter((item) => normalizeSource(String(item)) !== null);
    args[sourceName] = property.type === "array" || property.items ? all : "all";
  }

  const typeName = names.find((name) => ["type", "documentType", "document_type", "tipo"].includes(name.toLowerCase()));
  if (typeName) {
    const enumValues = properties[typeName].enum;
    args[typeName] = Array.isArray(enumValues) && !enumValues.includes(type) ? enumValues.find((item) => String(item).toLowerCase() === type) ?? enumValues[0] : type;
  }
  const offsetName = names.find((name) => ["offset", "pageOffset", "page_offset"].includes(name.toLowerCase()));
  if (offsetName) args[offsetName] = offset;
  const limitName = names.find((name) => ["limit", "pageSize", "page_size", "count"].includes(name.toLowerCase()));
  if (limitName) args[limitName] = Math.min(25, properties[limitName].maximum || 10);
  return args;
}

function toolPayload(result, allowPlainText = false) {
  if (result?.isError) throw new HttpsError("unavailable", "La búsqueda jurídica fue rechazada por el proveedor.");
  if (result?.structuredContent && typeof result.structuredContent === "object") return result.structuredContent;
  const text = Array.isArray(result?.content) ? result.content.filter((item) => item.type === "text").map((item) => item.text).join("\n") : "";
  const parsed = parseResponseBody(text);
  if (parsed && typeof parsed === "object") return parsed;
  if (allowPlainText && text) return { text };
  throw new HttpsError("data-loss", "La respuesta del proveedor no contiene resultados estructurados.");
}

function extractResults(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["results", "items", "cases", "documents", "matches", "fallos"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  for (const key of ["data", "result", "response"]) {
    if (payload[key] && typeof payload[key] === "object") {
      const rows = extractResults(payload[key]);
      if (rows) return rows;
    }
  }
  return null;
}

async function searchTool(query, type, offset, apiKey, sessionId) {
  const tool = toolSchemaCache?.find((item) => item.name === "search-jurisprudence");
  if (!tool) throw new HttpsError("failed-precondition", "La herramienta de búsqueda multi-fuente no está disponible en el proveedor.");
  const called = await postMcp({
    jsonrpc: "2.0", id: 3, method: "tools/call",
    params: { name: tool.name, arguments: makeSearchArguments(tool, query, type, offset) },
  }, apiKey, sessionId);
  return toolPayload(called.data?.result);
}

async function detailTool(providerId, apiKey, sessionId) {
  const tool = toolSchemaCache?.find((item) => item.name === "get-case-details");
  if (!tool) throw new HttpsError("failed-precondition", "La consulta de texto completo no está disponible en el proveedor.");
  const schema = tool.inputSchema || {};
  const properties = schema.properties || {};
  const names = Object.keys(properties);
  const idName = names.find((name) => ["id", "uuid", "caseId", "case_id", "falloId", "fallo_id", "identifier"].includes(name.toLowerCase()))
    || (Array.isArray(schema.required) ? schema.required[0] : null);
  if (!idName) throw new HttpsError("failed-precondition", "El contrato de detalle del proveedor requiere adaptación.");
  const called = await postMcp({
    jsonrpc: "2.0", id: 3, method: "tools/call",
    params: { name: tool.name, arguments: { [idName]: providerId } },
  }, apiKey, sessionId);
  const payload = toolPayload(called.data?.result, true);
  const details = payload.document || payload.case || payload.fallo || payload.result || payload.data || payload;
  const normalized = normalizeResult(details && typeof details === "object" ? details : payload);
  return { ...normalized, providerId: normalized.providerId || providerId };
}

function requireAuthorized(request) {
  const email = request.auth?.token?.email;
  if (!request.auth || email !== allowedEmail || request.auth.token.email_verified !== true) {
    throw new HttpsError("permission-denied", "La cuenta no está autorizada para consultar jurisprudencia.");
  }
}

function requireKey() {
  const key = juridicaApiKey.value();
  if (!key) throw new HttpsError("failed-precondition", "La clave de Jurídica todavía no está configurada en Secret Manager.");
  return key;
}

exports.searchJurisprudence = onCall(
  { region: "southamerica-east1", secrets: [juridicaApiKey], timeoutSeconds: 45, maxInstances: 2 },
  async (request) => {
    requireAuthorized(request);
    const query = typeof request.data?.query === "string" ? request.data.query.trim() : "";
    const type = typeof request.data?.type === "string" ? request.data.type : "jurisprudencia";
    const offset = Number.isInteger(request.data?.offset) ? request.data.offset : 0;
    if (query.length < 2 || query.length > 300 || offset < 0 || offset > 5000 || !acceptedSearchTypes.has(type)) {
      throw new HttpsError("invalid-argument", "La búsqueda debe tener entre 2 y 300 caracteres y una página válida.");
    }
    const apiKey = requireKey();
    const sessionId = await connectMcp(apiKey);
    const payload = await searchTool(query, type, offset, apiKey, sessionId);
    const rawResults = extractResults(payload);
    if (!rawResults) throw new HttpsError("data-loss", "El proveedor no devolvió una lista de resultados reconocible.");
    return {
      query,
      type,
      total: Number.isInteger(payload.total) ? payload.total : Number.isInteger(payload.totalCount) ? payload.totalCount : null,
      count: rawResults.length,
      offset,
      provider: "juridica-multisource",
      results: rawResults.map(normalizeResult),
    };
  },
);

exports.getJurisprudenceDetails = onCall(
  { region: "southamerica-east1", secrets: [juridicaApiKey], timeoutSeconds: 45, maxInstances: 2 },
  async (request) => {
    requireAuthorized(request);
    const providerId = typeof request.data?.providerId === "string" ? request.data.providerId.trim() : "";
    if (!providerId || providerId.length > 300) throw new HttpsError("invalid-argument", "Falta un identificador válido del resultado.");
    const apiKey = requireKey();
    const sessionId = await connectMcp(apiKey);
    return { provider: "juridica-multisource", result: await detailTool(providerId, apiKey, sessionId) };
  },
);
