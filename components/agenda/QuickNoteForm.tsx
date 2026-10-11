"use client";

import { useState, type FormEvent } from "react";

export function QuickNoteForm({ busy, onClose, onSave }: { busy: boolean; onClose: () => void; onSave: (title: string, text: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) { setError("Escribí el contenido de la nota."); return; }
    try { await onSave(title.trim() || "Nota rápida", text.trim()); } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo guardar la nota."); }
  }
  return <div className="agenda-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><section className="agenda-note-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-note-title"><header className="agenda-dialog-header"><div><span className="agenda-eyebrow">ANOTACIÓN PERSONAL</span><h2 id="quick-note-title">Nueva nota rápida</h2><p>Se guardará en la agenda con fecha y hora de creación.</p></div><button type="button" className="agenda-icon-button" onClick={onClose} aria-label="Cerrar">×</button></header><form onSubmit={(event) => void submit(event)}><label>Título (opcional)<input maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} autoFocus /></label><label>Nota<textarea required rows={6} maxLength={4000} value={text} onChange={(event) => setText(event.target.value)} /></label>{error && <p className="agenda-error" role="alert">{error}</p>}<footer className="agenda-form-actions"><span className="agenda-action-spacer"/><button className="agenda-button secondary" type="button" onClick={onClose} disabled={busy}>Cancelar</button><button className="agenda-button primary" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar nota"}</button></footer></form></section></div>;
}
