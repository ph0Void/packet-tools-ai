import type { Metadata } from "next";
import { getSessionUser } from "@/action/SecureAction";
import {
  getDocuments,
  type KnowledgeDocument,
} from "@/service/KnowledgeBaseService";
import KnowledgeBaseManager from "@/component/data/KnowledgeBaseManager";
import { getServerDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return {
    title: `Packet Tools - ${t.dashboard.metadata.data.title}`,
    description: t.dashboard.metadata.data.description,
  };
}

export default async function PageDataKnowledge() {
  const user = await getSessionUser();
  const canManage = user?.role === "ADMIN" || user?.role === "STAFF";

  const result = await getDocuments();
  const documents: KnowledgeDocument[] =
    result.success && Array.isArray(result.data) ? result.data : [];

  return (
    <div className="space-y-6 text-foreground p-1">
      <KnowledgeBaseManager
        initialDocuments={documents}
        canManage={canManage}
      />
    </div>
  );
}
