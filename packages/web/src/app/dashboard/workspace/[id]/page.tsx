import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/action/SecureAction";
import { getTopologyByIdAction } from "@/action/TopologyAction";
import WorkspaceContainer from "@/component/workspace/WorkspaceContainer";
import { parseTopologyJson } from "@/component/workspace/topology-json";
import { notFound } from "next/navigation";
import { getServerDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return {
    title: `Packet Tools - ${t.dashboard.metadata.workspaceDetail.title}`,
    description: t.dashboard.metadata.workspaceDetail.description,
  };
}

interface WorkspacePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WorkspacePageId({ params }: WorkspacePageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/auth");

  const canEdit = user.role === "STAFF" || user.role === "ADMIN";

  const { id } = await params;
  const result = await getTopologyByIdAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const { devices, links } = parseTopologyJson(result.data.topologyJson);

  return (
    <WorkspaceContainer
      topologyId={id}
      initialName={result.data.name}
      initialDescription={result.data.description ?? ""}
      initialDevices={devices}
      initialLinks={links}
      canEdit={canEdit}
    />
  );
}
