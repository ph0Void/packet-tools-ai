export interface SkillMencion {
  id: string;
  slug: string;
  title: string;
  description: string | null;
}

interface Envelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export async function getSkillsParaMencion(): Promise<SkillMencion[]> {
  try {
    const res = await fetch("/api/skills?resumidas=1", {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return [];

    const cuerpo = (await res.json()) as Envelope<SkillMencion[]>;
    if (!cuerpo.success || !Array.isArray(cuerpo.data)) return [];

    return cuerpo.data.map((skill) => ({
      id: skill.id,
      slug: skill.slug,
      title: skill.title,
      description: skill.description,
    }));
  } catch {
    return [];
  }
}
