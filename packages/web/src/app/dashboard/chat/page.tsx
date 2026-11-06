import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/action/SecureAction";
import ChatPrincipalWraper from "@/component/chat/ChatPrincipalWraper";
import { getServerDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return {
    title: `Packet Tools - ${t.dashboard.metadata.chat.title}`,
    description: t.dashboard.metadata.chat.description,
  };
}

export default async function ChatPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth");

  return (
    <div className="flex h-full w-full min-h-0">
      <ChatPrincipalWraper />
    </div>
  );
}
