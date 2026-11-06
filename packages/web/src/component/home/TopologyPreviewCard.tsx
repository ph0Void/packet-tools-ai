import Link from "next/link";
import { Network, ArrowRight, Boxes } from "lucide-react";
import { getServerDictionary } from "@/i18n/server";

interface TopologyPreviewCardProps {
  topology: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

export default async function TopologyPreviewCard({
  topology,
}: TopologyPreviewCardProps) {
  const t = await getServerDictionary();

  return (
    <section className="panel flex h-full flex-col p-5">
      <header className="mb-4 flex items-center gap-2">
        <Network className="size-4 shrink-0 text-muted-foreground" />
        <h3 className="font-heading text-sm font-semibold text-foreground">
          {t.dashboard.home.topology.title}
        </h3>
      </header>

      {topology ? (
        <div className="flex flex-1 flex-col gap-3">
          <div className="panel-inset p-4 transition-colors duration-200 hover:border-primary/35">
            <p className="truncate font-heading text-sm font-semibold text-foreground">
              {topology.name}
            </p>
            <p className="mt-1.5 min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground">
              {topology.description || t.dashboard.home.topology.noDescription}
            </p>
          </div>

          <Link
            href="/dashboard/workspace"
            className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[0.8125rem] font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/85"
          >
            {t.dashboard.home.topology.open}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
          <Boxes className="size-8 text-muted-foreground/40" />
          <p className="max-w-[22ch] text-sm leading-relaxed text-muted-foreground">
            {t.dashboard.home.topology.empty}
          </p>
          <Link
            href="/dashboard/topology"
            className="mt-1 rounded-lg border border-border bg-card px-4 py-2 text-[0.8125rem] font-semibold text-foreground transition-colors duration-200 hover:bg-muted"
          >
            {t.dashboard.home.topology.goToTopologies}
          </Link>
        </div>
      )}
    </section>
  );
}
