"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getCatalogApiUrl, requestCatalog, type CatalogCoverage, type CatalogJurisdiction, type CatalogOrganization, type CatalogPage } from "../../lib/judicial-catalog/contract";

const emptyPage: CatalogPage = { data: [], page: 1, pageSize: 20, total: 0, hasMore: false };
const firstPageSize = 20;

export function OrganizationsWorkspace() {
  const apiConfigured = Boolean(getCatalogApiUrl());
  const [query, setQuery] = useState("");
  const [jurisdictionId, setJurisdictionId] = useState("");
  const [province, setProvince] = useState("");
  const [region, setRegion] = useState("");
  const [branch, setBranch] = useState("");
  const [locality, setLocality] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<CatalogPage>(emptyPage);
  const [jurisdictions, setJurisdictions] = useState<CatalogJurisdiction[]>([]);
  const [coverage, setCoverage] = useState<CatalogCoverage | null>(null);
  const [selected, setSelected] = useState<CatalogOrganization | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(firstPageSize) });
    if (query.trim()) params.set("q", query.trim());
    if (jurisdictionId) params.set("jurisdictionId", jurisdictionId);
    if (province.trim()) params.set("province", province.trim());
    if (region.trim()) params.set("region", region.trim());
    if (branch.trim()) params.set("branch", branch.trim());
    if (locality.trim()) params.set("locality", locality.trim());
    return params.toString();
  }, [branch, jurisdictionId, locality, page, province, query, region]);

  useEffect(() => {
    if (!apiConfigured) return;
    const controller = new AbortController();
    Promise.all([
      requestCatalog<{ data: CatalogJurisdiction[] }>("/jurisdicciones", controller.signal),
      requestCatalog<CatalogCoverage>("/cobertura", controller.signal),
    ]).then(([jurisdictionResponse, coverageResponse]) => {
      setJurisdictions(jurisdictionResponse.data);
      setCoverage(coverageResponse);
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "No se pudo conectar con el catálogo.");
    });
    return () => controller.abort();
  }, [apiConfigured]);

  useEffect(() => {
    if (!apiConfigured || !searched) return;
    const controller = new AbortController();
    setLoading(true);
    requestCatalog<CatalogPage>(`/organismos?${queryString}`, controller.signal)
      .then((data) => { setResult(data); setError(""); })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "No se pudieron consultar los organismos.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [apiConfigured, queryString, searched]);

  function search(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearched(true);
  }

  function clearFilters() {
    setQuery(""); setJurisdictionId(""); setProvince(""); setRegion(""); setBranch(""); setLocality("");
    setPage(1); setSearched(true); setSelected(null);
  }

  async function openOrganization(organization: CatalogOrganization) {
    setSelected(organization);
    try {
      const detail = await requestCatalog<{ data: CatalogOrganization & { contacts: Array<{type:string;label:string|null;value:string;details:string|null}>; links: Array<{type:string;label:string|null;url:string}>; authorities:Array<{personName:string;role:string;status:string}>; provenance:Array<{fieldPath:string;sourceName:string|null;sourceUrl:string;verifiedAt:string|null}>; history:Array<{fieldPath:string;oldValue:string|null;newValue:string|null;changedAt:string;sourceUrl:string|null}> } }>(`/organismos/${encodeURIComponent(organization.id)}`);
      setSelected(detail.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo abrir la ficha del organismo.");
    }
  }

  const detail = selected as (CatalogOrganization & {
    contacts?: Array<{type:string;label:string|null;value:string;details:string|null}>;
    links?: Array<{type:string;label:string|null;url:string}>;
    authorities?: Array<{personName:string;role:string;status:string}>;
    provenance?: Array<{fieldPath:string;sourceName:string|null;sourceUrl:string;verifiedAt:string|null}>;
    history?: Array<{fieldPath:string;oldValue:string|null;newValue:string|null;changedAt:string;sourceUrl:string|null}>;
  }) | null;

  return <main className="panel-main organization-main">
    <div className="breadcrumbs">Inicio / Gestión jurídica / <b>Organismos judiciales</b></div>
    <header className="domain-heading organization-heading">
      <div><span className="agenda-eyebrow">CATÁLOGO JUDICIAL NACIONAL</span><h1>Organismos judiciales</h1><p>Directorio consultable de organismos, dependencias, contactos y referencias institucionales.</p></div>
      <div className="organization-total"><strong>{coverage?.totalOrganizations ?? "—"}</strong><span>registros publicados</span></div>
    </header>

    {!apiConfigured && <div className="organization-state" role="status"><strong>API pendiente de configuración</strong><span>La pantalla está conectada al contrato del catálogo. Falta definir la URL pública de la API para consultar los registros.</span></div>}
    {error && <p className="agenda-error" role="alert">{error}</p>}

    <section className="organization-search-card data-card">
      <form onSubmit={search}>
        <label className="organization-query-label" htmlFor="organization-query">Buscar en el catálogo</label>
        <div className="organization-query-row"><span aria-hidden="true">⌕</span><input id="organization-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Organismo, número, fuero, localidad o denominación alternativa" /><button className="agenda-button primary" disabled={!apiConfigured || loading}>{loading ? "Buscando…" : "Buscar"}</button></div>
        <div className="organization-filters">
          <label>Jurisdicción<select value={jurisdictionId} onChange={(event) => setJurisdictionId(event.target.value)}><option value="">Todas las jurisdicciones</option>{jurisdictions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Provincia<input value={province} onChange={(event) => setProvince(event.target.value)} placeholder="Nombre de provincia" /></label>
        <label>Región<input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Región" /></label>
          <label>Fuero o competencia<input value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="Civil, laboral, electoral…" /></label>
          <label>Localidad<input value={locality} onChange={(event) => setLocality(event.target.value)} placeholder="Localidad" /></label>
          <button type="button" className="agenda-button secondary" onClick={clearFilters} disabled={!apiConfigured}>Limpiar</button>
        </div>
      </form>
    </section>

    <div className="organization-layout">
      <section className="organization-results data-card" aria-live="polite">
        <header className="organization-results-header"><div><span className="agenda-eyebrow">DIRECTORIO</span><h2>{searched ? "Resultados de búsqueda" : "Consulta de organismos"}</h2></div><span>{searched ? `${result.total} registros` : "Búsqueda nacional"}</span></header>
        {!apiConfigured ? <div className="organization-empty">La conexión quedará disponible al configurar la URL del Worker.</div>
          : !searched ? <div className="organization-empty">Ingresá un término o elegí filtros para consultar el catálogo.</div>
          : loading ? <div className="organization-empty">Consultando la fuente oficial normalizada…</div>
          : result.data.length === 0 ? <div className="organization-empty"><strong>No hay resultados publicados para esta consulta.</strong><span>Los registros aparecerán cuando se complete la importación y revisión de las fuentes.</span></div>
          : <div className="organization-cards">{result.data.map((item) => <article className="organization-card" key={item.id}><div className="organization-card-icon" aria-hidden="true">⚖</div><div className="organization-card-content"><div className="organization-card-tags">{item.jurisdictionName && <span>{item.jurisdictionName}</span>}{item.branch && <span>{item.branch}</span>}</div><h3>{item.officialName}</h3><p>{[item.organizationType, item.instance, item.judicialDistrict, item.locality, item.provinceName].filter(Boolean).join(" · ") || "Ficha institucional"}</p><button className="organization-open" type="button" onClick={() => void openOrganization(item)}>Ver ficha y procedencia <span aria-hidden="true">→</span></button></div></article>)}</div>}
        {searched && result.total > 0 && <footer className="organization-pagination"><span>Página {result.page} · {result.pageSize} por página</span><div><button className="agenda-button secondary" type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><button className="agenda-button secondary" type="button" disabled={!result.hasMore || loading} onClick={() => setPage((value) => value + 1)}>Siguiente</button></div></footer>}
      </section>

      <aside className="organization-sidebar">
        <section className="data-card organization-summary"><span className="agenda-eyebrow">COBERTURA PUBLICADA</span><h2>Estado del catálogo</h2><p>{coverage ? `${coverage.jurisdictions.length} jurisdicciones registradas` : "Esperando respuesta de la API"}</p><div className="organization-summary-list">{coverage?.jurisdictions.slice(0, 8).map((item) => <div key={item.jurisdictionId}><span>{item.jurisdictionName}</span><strong>{item.organizationCount}</strong></div>)}</div><small>La cobertura refleja únicamente registros realmente importados.</small></section>
        <section className="data-card organization-summary"><span className="agenda-eyebrow">FUENTES</span><h2>Procedencia y revisión</h2>{coverage?.sources.length ? <div className="organization-source-list">{coverage.sources.map((source) => <div key={source.id}><strong>{source.name}</strong><span>{source.reviewStatus === "verified" ? "Verificada" : source.reviewStatus === "pending" ? "Pendiente de revisión" : source.reviewStatus}</span>{source.lastCheckedAt && <small>Revisada: {new Date(source.lastCheckedAt).toLocaleDateString("es-AR")}</small>}</div>)}</div> : <p>Las fuentes se mostrarán cuando se registren y aprueben para importación.</p>}</section>
      </aside>
    </div>

    {detail && <div className="organization-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="organization-detail" role="dialog" aria-modal="true" aria-labelledby="organization-detail-title"><header><div><span className="agenda-eyebrow">FICHA DEL CATÁLOGO</span><h2 id="organization-detail-title">{detail.officialName}</h2></div><button type="button" className="organization-close" onClick={() => setSelected(null)} aria-label="Cerrar ficha">×</button></header><div className="organization-detail-body"><dl>{[["Tipo", detail.organizationType], ["Jurisdicción", detail.jurisdictionName], ["Fuero / competencia", detail.branch], ["Instancia", detail.instance], ["Distrito", detail.judicialDistrict], ["Localidad", detail.locality], ["Provincia", detail.provinceName], ["Región", detail.region]].filter(([, value]) => value).map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{detail.contacts?.length ? <section><h3>Contactos vigentes</h3>{detail.contacts.map((contact, index) => <p key={`${contact.type}-${index}`}><b>{contact.label || contact.type}:</b> {contact.value}{contact.details ? ` · ${contact.details}` : ""}</p>)}</section> : null}{detail.links?.length ? <section><h3>Enlaces institucionales</h3>{detail.links.map((link) => <p key={link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.label || link.type} ↗</a></p>)}</section> : null}{detail.authorities?.length ? <section><h3>Autoridades registradas</h3>{detail.authorities.map((person, index) => <p key={`${person.personName}-${index}`}>{person.personName} · {person.role} · {person.status}</p>)}</section> : null}<section><h3>Procedencia</h3>{detail.provenance?.length ? detail.provenance.map((item, index) => <p key={`${item.fieldPath}-${index}`}><b>{item.fieldPath}</b> · {item.sourceName || "Fuente identificada"} · <a href={item.sourceUrl} target="_blank" rel="noreferrer">Abrir fuente ↗</a>{item.verifiedAt ? ` · Verificada ${new Date(item.verifiedAt).toLocaleDateString("es-AR")}` : " · Verificación pendiente"}</p>) : <p>La procedencia se completará con los registros importados. No se presenta información sin fuente asociada.</p>}</section>{detail.history?.length ? <section><h3>Historial de modificaciones</h3>{detail.history.map((event, index) => <p key={`${event.changedAt}-${index}`}>{new Date(event.changedAt).toLocaleString("es-AR")} · {event.fieldPath}{event.oldValue ? ` · Anterior: ${event.oldValue}` : ""}{event.newValue ? ` · Nuevo: ${event.newValue}` : ""}</p>)}</section> : null}</div></section></div>}
  </main>;
}
