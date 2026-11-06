import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/action/SecureAction";
import { getAlerts } from "@/service/AlertService";
import { getTopologies } from "@/service/TopologyService";
import TableAlertWrapper from "@/component/alert/TableAlertWrapper";
import { getServerDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return {
    title: `Packet Tools - ${t.dashboard.metadata.alert.title}`,
    description: t.dashboard.metadata.alert.description,
  };
}

export default async function AlertPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth");

  const [alertsResult, topologiesResult] = await Promise.allSettled([
    getAlerts(),
    getTopologies(),
  ]);

  const alerts =
    alertsResult.status === "fulfilled" &&
    alertsResult.value.success &&
    alertsResult.value.data
      ? alertsResult.value.data
      : [];

  const topologies =
    topologiesResult.status === "fulfilled" &&
    topologiesResult.value.success &&
    topologiesResult.value.data
      ? topologiesResult.value.data.map((topology) => ({
          id: topology.id,
          name: topology.name,
        }))
      : [];

  return (
    <div className="space-y-6 text-foreground p-1">
      <TableAlertWrapper
        initialAlerts={alerts}
        topologies={topologies}
        userRole={user.role}
      />
    </div>
  );
}
