import { AuthGate } from "../../components/auth/AuthGate";
import { PanelShell } from "../../components/panel/PanelShell";
import "./agenda/agenda.css";
import "./tareas/tasks.css";
import "./notificaciones/notifications.css";
import "./organismos/organizations.css";
import "./domain-records.css";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate><PanelShell>{children}</PanelShell></AuthGate>;
}
