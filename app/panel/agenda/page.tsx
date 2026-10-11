import { AgendaWorkspace } from "../../../components/agenda/AgendaWorkspace";
import "./agenda.css";

export default function AgendaPage() {
  return <AgendaWorkspace initialDate={new Date().toISOString()} />;
}
