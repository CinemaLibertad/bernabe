import { AuthGate } from "../../components/auth/AuthGate";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <AuthGate>{children}</AuthGate>;
}
