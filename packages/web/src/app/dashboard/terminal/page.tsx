import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/action/SecureAction";
import { TerminalWorkspace } from "@/component/terminal/TerminalWorkspace";
import { getServerDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return {
    title: `Packet Tools - ${t.dashboard.metadata.terminal.title}`,
    description: t.dashboard.metadata.terminal.description,
  };
}

export default async function PageTerminal() {
  const user = await getSessionUser();
  if (!user) redirect("/auth");

  return <TerminalWorkspace role={user.role} />;
}
