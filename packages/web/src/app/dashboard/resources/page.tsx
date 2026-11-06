import type { Metadata } from "next";
import UserManual from "@/component/resources/UserManual";
import { getServerDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return {
    title: `Packet Tools - ${t.dashboard.metadata.resources.title}`,
    description: t.dashboard.metadata.resources.description,
  };
}

export default async function PageResources() {
  const t = await getServerDictionary();

  return (
    <div className="space-y-6 text-foreground p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t.dashboard.resources.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t.dashboard.resources.description}
        </p>
      </div>

      <UserManual />
    </div>
  );
}
