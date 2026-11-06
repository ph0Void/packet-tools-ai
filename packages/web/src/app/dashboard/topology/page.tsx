import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/action/SecureAction";
import { getTopologies } from "@/service/TopologyService";
import TableTopologyWrapper from "@/component/topology/TableTopologyWrapper";
import type { TopologyRow } from "@/component/topology/types";
import { getServerDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return {
    title: `Packet Tools - ${t.dashboard.metadata.topology.title}`,
    description: t.dashboard.metadata.topology.description,
  };
}

interface PageProps {
  searchParams: Promise<{ page?: string; limit?: string }>;
}

const DEFAULT_PAGE_SIZE = 10;

export default async function TopologyPage({ searchParams }: PageProps) {
  const [user, t] = await Promise.all([
    getSessionUser(),
    getServerDictionary(),
  ]);
  if (!user) redirect("/auth");

  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const currentLimit = Number(params.limit) || DEFAULT_PAGE_SIZE;

  const result = await getTopologies();
  const allTopologies =
    result.success && result.data
      ? result.data.map<TopologyRow>((topology) => ({
          id: topology.id,
          name: topology.name,
          description: topology.description,
          createdAt: topology.createdAt,
        }))
      : [];

  const totalItems = allTopologies.length;
  const totalPages = Math.ceil(totalItems / currentLimit) || 1;
  const start = (currentPage - 1) * currentLimit;
  const topologies = allTopologies.slice(start, start + currentLimit);

  return (
    <div className="space-y-4 text-foreground">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t.dashboard.topology.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t.dashboard.topology.description}
        </p>
      </div>

      <TableTopologyWrapper
        initialTopologies={topologies}
        pagination={{
          currentPage,
          totalPages,
          totalItems,
          limit: currentLimit,
        }}
        canManage={user.role === "ADMIN" || user.role === "STAFF"}
      />
    </div>
  );
}
