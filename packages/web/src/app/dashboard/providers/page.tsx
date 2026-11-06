import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/action/SecureAction";
import ModelProvidersManager from "@/component/configuration/ModelProvidersManager";
import { getServerDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return {
    title: `Packet Tools - ${t.dashboard.metadata.providers.title}`,
    description: t.dashboard.metadata.providers.description,
  };
}

export default async function PageProviders() {
  const [user, t] = await Promise.all([
    getSessionUser(),
    getServerDictionary(),
  ]);
  if (user?.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6 text-foreground p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t.dashboard.providers.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t.dashboard.providers.description}
        </p>
      </div>

      <ModelProvidersManager />
    </div>
  );
}
