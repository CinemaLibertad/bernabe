import { AuthGate } from "../../components/auth/AuthGate";
import { PanelShell } from "../../components/panel/PanelShell";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate><PanelShell>{children}</PanelShell></AuthGate>;
}
