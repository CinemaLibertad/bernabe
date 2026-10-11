"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getClientAuth } from "../../lib/firebase/client";
import type { Client, ClientInput } from "../../lib/clients/client.model";
import { validateClient } from "../../lib/clients/client.service";
import { listClients, saveClient } from "../../lib/firebase/domain-repositories";

const empty: ClientInput = { kind: "persona", displayName: "", legalName: "", identifier: "", email: "", phone: "", address: "", notes: "", status: "activo" };

export function ClientsWorkspace() {
  const [items, setItems] = useState<Client[]>([]);
  const [draft, setDraft] = useState<ClientInput>(empty);
  const [editing, setEditing] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  async function refresh() { setLoading(true); try { setItems(await listClients()); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "No se pudieron consultar los clientes."); } finally { setLoading(false); } }
  useEffect(() => { void refresh(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); const problem = validateClient(draft); if (problem) { setError(problem); return; }
    const user = getClientAuth().currentUser; if (!user) { setError("La sesión no está disponible."); return; }
    setSaving(true); try { await saveClient(draft, user, editing); setDraft(empty); setEditing(undefined); setError(""); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar el cliente."); } finally { setSaving(false); }
  }
  const filtered = items.filter((item) => [item.displayName, item.legalName, item.identifier, item.email, item.phone].join(" ").toLocaleLowerCase("es-AR").includes(search.toLocaleLowerCase("es-AR")));
  return <main className="panel-main domain-main"><div className="breadcrumbs">Inicio / <b>Clientes</b></div><header className="domain-heading"><div><span className="agenda-eyebrow">NÚCLEO DE INFORMACIÓN</span><h1>Clientes</h1><p>Registro centralizado. Los expedientes y actividades mantienen relaciones por identificador.</p></div></header>{error && <p className="agenda-error" role="alert">{error}</p>}<div className="domain-grid"><section className="data-card"><h2>{editing ? "Editar cliente" : "Registrar cliente"}</h2><form className="domain-form" onSubmit={(event) => void submit(event)}><label>Tipo<select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as ClientInput["kind"] })}><option value="persona">Persona</option><option value="organizacion">Organización</option></select></label><label>Nombre visible<input required value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} /></label><label>Razón social / nombre legal<input value={draft.legalName} onChange={(e) => setDraft({ ...draft, legalName: e.target.value })} /></label><label>DNI / CUIT<input value={draft.identifier} onChange={(e) => setDraft({ ...draft, identifier: e.target.value })} /></label><label>Correo<input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></label><label>Teléfono<input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label><label>Dirección<input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></label><label>Observaciones<textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></label><div className="domain-actions"><button className="agenda-button primary" disabled={saving}>{saving ? "Guardando…" : editing ? "Guardar cambios" : "Guardar cliente"}</button>{editing && <button type="button" className="agenda-button secondary" onClick={() => { setDraft(empty); setEditing(undefined); }}>Cancelar</button>}</div></form></section><section className="data-card domain-list"><header><h2>Registro de clientes</h2><input type="search" placeholder="Buscar por nombre, documento o contacto" value={search} onChange={(e) => setSearch(e.target.value)} /></header>{loading ? <p>Consultando registros…</p> : filtered.length ? <div className="domain-table-wrap"><table className="domain-table"><thead><tr><th>Cliente</th><th>Identificación</th><th>Contacto</th><th>Estado</th><th></th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><strong>{item.displayName}</strong><small>{item.legalName}</small></td><td>{item.identifier || "—"}</td><td>{item.email || item.phone || "—"}</td><td>{item.status}</td><td><button type="button" className="agenda-button secondary" onClick={() => { setEditing(item.id); setDraft({ kind: item.kind, displayName: item.displayName, legalName: item.legalName, identifier: item.identifier, email: item.email, phone: item.phone, address: item.address, notes: item.notes, status: item.status }); }}>Editar</button></td></tr>)}</tbody></table></div> : <p className="agenda-empty-copy">No hay clientes que coincidan con la búsqueda.</p>}</section></div></main>;
}
