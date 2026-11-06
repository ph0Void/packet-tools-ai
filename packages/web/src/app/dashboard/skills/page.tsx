import type { Metadata } from "next";
import { getSessionUser } from "@/action/SecureAction";
import { getSkillsAction } from "@/action/SkillAction";
import type { Skill } from "@/service/SkillService";
import SkillsManager from "@/component/skills/SkillsManager";
import { getServerDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerDictionary();
  return {
    title: `Packet Tools - ${t.dashboard.metadata.skills.title}`,
    description: t.dashboard.metadata.skills.description,
  };
}

export default async function PageSkills() {
  const user = await getSessionUser();
  const role = user?.role;
  const canEdit = role === "ADMIN" || role === "STAFF";

  const canDelete = role === "ADMIN";

  const result = await getSkillsAction();
  const skills: Skill[] = result.success ? (result.data ?? []) : [];

  return (
    <div className="space-y-6 p-4 text-foreground md:p-6">
      <SkillsManager
        initialSkills={skills}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
