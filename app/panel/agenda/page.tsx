import { AgendaWorkspace } from "../../../components/agenda/AgendaWorkspace";

type Props = { searchParams: Promise<{ activityId?: string; newType?: string }> };

export default async function AgendaPage({ searchParams }: Props) {
  const params = await searchParams;
  return <AgendaWorkspace initialDate={new Date().toISOString()} requestedActivityId={params.activityId ?? ""} requestedType={params.newType ?? ""} />;
}
