"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listCases } from "../../lib/firebase/domain-repositories";
import { listCourtActivity } from "../../lib/court-activity/court-activity.repository";
import type { CourtActuation } from "../../lib/court-activity/court-activity.model";
import type { LegalCase } from "../../lib/cases/case.model";

const formatDate = (value: string) => value ? new Intl.DateTimeFormat("es-AR", { dateStyle: "full", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value)) : "Fecha no informada";
const verificationLabel = { observed: "Observada por el profesional", reported: "Informada por tercero", document_verified: "Verificada documentalmente" };

export function CourtProceedingsWorkspace() {
  const [items, setItems] = useState<CourtActuation[]>([]);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    void Promise.all([listCourtActivity(), listCases()]).then(([activity, caseRows]) => {
      if (!cancelled) { setItems(activity.actuations); setCases(caseRows); }
    }).catch((failure: unknown) => {
      if (!cancelled) setError(failure instanceof Error ? failure.message : "No se pudieron cargar las actuaciones.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("es-AR");
    return items.filter((item) => !needle || [item.title, item.description, item.type, item.caseCaptionSnapshot, item.caseNumberSnapshot, item.organizationNameSnapshot].join(" ").toLocaleLowerCase("es-AR").includes(needle));
  }, [items, search]);
  return <main className="panel-main court-proceedings-main"><div className="breadcrumbs">Inicio / <b>Juicios y actuaciones</b></div>
    <header className="agenda-page-heading"><div><span className="agenda-eyebrow">HISTORIA PROCESAL</span><h1>Juicios y actuaciones</h1><p>Actuaciones vinculadas a expedientes, incorporadas desde consultas de tribunales o registradas directamente.</p></div><Link className="agenda-button primary" href="/panel/actividad-tribunales">Abrir Actividad de tribunales →</Link></header>
    {error && <p className="agenda-error" role="alert">{error}</p>}
    <section className="data-card court-history-list"><div className="court-section-heading"><div><span className="agenda-eyebrow">REGISTRO PROCESAL</span><h2>Actuaciones registradas</h2></div><span>{loading ? "Consultando…" : `${filtered.length} actuaciones`}</span></div>
      <div className="court-filters"><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por expediente, organismo o contenido" aria-label="Buscar actuaciones"/><span className="court-proceedings-source">Fuente única: registros de actuaciones del estudio</span></div>
      {filtered.length === 0 ? <div className="court-empty"><strong>{loading ? "Cargando actuaciones…" : "No hay actuaciones registradas"}</strong><span>Las actuaciones aparecerán aquí cuando se registren desde Actividad de tribunales o mediante una carga directa autorizada.</span><Link href="/panel/actividad-tribunales">Ir a Actividad de tribunales</Link></div> : <div className="court-record-list">{filtered.map((item) => {
        const caseRecord = cases.find((row) => row.id === item.caseId);
        return <article key={item.id}><div className="court-record-icon">⚖</div><div className="court-record-copy"><span>{item.type} · {formatDate(item.occurredAt)}</span><h3>{item.title}</h3><p>{item.description || "Sin descripción adicional."}</p><div className="court-proceedings-meta"><span>Expediente: {caseRecord?.caption ?? item.caseCaptionSnapshot}</span><span>{item.caseNumberSnapshot || caseRecord?.number || "Sin número informado"}</span><span>Organismo: {item.organizationNameSnapshot || "No informado"}</span><span>Origen: {item.source === "manual_web" ? "Carga web" : item.source === "mobile" ? "Aplicación móvil" : "Fuente oficial"}</span><span>Verificación: {verificationLabel[item.verification]}</span><span>Responsable: {item.updatedBy}</span></div>{item.documentReferences.length > 0 && <div className="court-doc-reference">Documentación: {item.documentReferences.map((reference) => <span key={reference}>{reference}</span>)}</div>}</div><div className="court-record-actions"><Link className="agenda-button secondary" href={`/panel/actividad-tribunales?expediente=${encodeURIComponent(item.caseId)}`}>Ver actividad</Link></div></article>;
      })}</div>}
    </section>
  </main>;
}
