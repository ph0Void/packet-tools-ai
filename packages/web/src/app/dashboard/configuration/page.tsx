import type { Metadata } from "next";
import { getSessionUser } from "@/action/SecureAction";
import { getConfig } from "@/service/ConfigService";
import SoundSettingsCard from "@/component/configuration/SoundSettingsCard";
import SystemPromptCard from "@/component/configuration/SystemPromptCard";
import ModelProvidersManager from "@/component/configuration/ModelProvidersManager";
import AgentLogsCard from "@/component/configuration/AgentLogsCard";
import { Settings } from "lucide-react";
import { getServerDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return {
    title: `Packet Tools - ${t.dashboard.metadata.configuration.title}`,
    description: t.dashboard.metadata.configuration.description,
  };
}

export default async function PageConfig() {
  const [user, t] = await Promise.all([
    getSessionUser(),
    getServerDictionary(),
  ]);

  const isAdmin = user?.role === "ADMIN";

  // getConfig está restringido a ADMIN en el backend: el resto de roles no debe llamarlo.
  const result = isAdmin ? await getConfig() : null;
  const initialPrompt =
    result?.success && result.data ? (result.data.systemPrompt ?? "") : "";

  const agentLogsEnabled = result?.data?.agentLogsEnabled ?? true;

  return (
    <div className="space-y-6 text-foreground p-1">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/40 bg-muted/30 p-4 md:p-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Settings className="h-5 w-5 text-primary" />
            {t.configuration.page.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {t.configuration.page.description}
          </p>
        </div>
      </div>

      <SoundSettingsCard />

      {isAdmin && (
        <>
          <AgentLogsCard initialEnabled={agentLogsEnabled} />
          <ModelProvidersManager />
          <SystemPromptCard initialPrompt={initialPrompt} />
        </>
      )}
    </div>
  );
}
