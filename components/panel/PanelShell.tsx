"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { getClientAuth } from "../../lib/firebase/client";

const menu = [
  ["GENERAL", [["▦", "Dashboard", "/panel"], ["□", "Agenda y calendario", "/panel/agenda"], ["◷", "Tareas y vencimientos", "/panel/tareas"], ["♧", "Notificaciones", "/panel/notificaciones"]]],
  ["GESTIÓN JURÍDICA", [["♙", "Clientes", "/panel/clientes"], ["▣", "Expedientes", "/panel/expedientes"], ["⚖", "Juicios y actuaciones", "#"], ["▤", "Organismos judiciales", "/panel/organismos"], ["▥", "Fallos y jurisprudencia", "#"]]],
  ["DOCUMENTACIÓN", [["▧", "Biblioteca documental", "#"], ["⌑", "Escáner y digitalización", "#"], ["◌", "Archivos pendientes", "#"]]],
  ["ADMINISTRACIÓN", [["$", "Finanzas", "#"], ["✉", "Consultas recibidas", "#"], ["⌁", "Informes y estadísticas", "#"]]],
];

export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="panel-shell"><aside className="panel-sidebar"><div className="sidebar-brand"><Image src="/images/brand/logo.png" alt="Bernabé Nieto" width={42} height={42} /><div><b>Bernabé Nieto</b><small>ESTUDIO JURÍDICO</small></div></div><div className="sidebar-credentials">Mat. N.º 1-31980<br />Mat. Fed. T.º 500 F.º 5</div><nav>{menu.map(([group, items]) => <div className="nav-group" key={String(group)}><span className="nav-label">{String(group)}</span>{(items as string[][]).map(([icon, label, href]) => <Link className={pathname === href ? "active" : ""} href={href} key={label}><i>{icon}</i>{label}</Link>)}</div>)}</nav><div className="sidebar-secure">◈ <span>Área privada</span></div></aside><section className="panel-content"><header className="panel-header"><div className="panel-search">⌕ <input placeholder="Buscar causas, clientes, expedientes…" /></div><Link href="/" className="public-link">◉ Sitio público</Link><Link href="/panel/notificaciones" className="icon-button" aria-label="Notificaciones">♧</Link><div className="user-chip"><span>Dr. Bernabé Nieto</span><small>Socio titular</small><button onClick={() => void signOut(getClientAuth())} aria-label="Cerrar sesión">↪</button></div></header>{children}</section></div>;
}
