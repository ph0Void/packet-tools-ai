import { api, type ApiResponse } from "@/service/client/ApiClient";

export interface Skill {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
}

export interface SkillResumen {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  enabled: boolean;
  updatedAt: string;
  createdById: string | null;
}

export interface SkillInput {
  title: string;
  description?: string | null;
  content: string;
}

export interface SkillUpdateInput {
  title?: string;
  description?: string | null;
  content?: string;
  enabled?: boolean;
}

export function getSkills(q?: string): Promise<ApiResponse<Skill[]>> {
  return api<Skill[]>(`/api/skills${q ? `?q=${encodeURIComponent(q)}` : ""}`);
}

export function getSkill(id: string): Promise<ApiResponse<Skill>> {
  return api<Skill>(`/api/skills/${id}`);
}

export function createSkill(input: SkillInput): Promise<ApiResponse<Skill>> {
  return api<Skill>("/api/skills", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSkill(
  id: string,
  input: SkillUpdateInput,
): Promise<ApiResponse<Skill>> {
  return api<Skill>(`/api/skills/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteSkill(id: string): Promise<ApiResponse<null>> {
  return api<null>(`/api/skills/${id}`, { method: "DELETE" });
}
