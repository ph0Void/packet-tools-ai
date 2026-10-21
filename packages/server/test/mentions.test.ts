

import { describe, expect, it } from "vitest";
import {
  extractMention,
  extractMentions,
  extractSkillMention,
  hasPlanMention,
  hasRagMention,
  hasWebMention,
} from "@/agent/terminal/MentionParser";

describe("menciones reservadas", () => {
  it("detecta @rag y @web sin distinguir mayúsculas", () => {
    expect(hasRagMention("consulta @rag")).toBe(true);
    expect(hasRagMention("consulta @RAG")).toBe(true);
    expect(hasWebMention("busca @web")).toBe(true);
    expect(hasWebMention("busca @WEB")).toBe(true);
  });

  it("no confunde una mención normal con rag/web", () => {
    expect(hasRagMention("configura @router1")).toBe(false);
    expect(hasWebMention("configura @router1")).toBe(false);
    
    expect(hasRagMention("revisa @dragon")).toBe(false);
  });
});

describe("@plan", () => {
  it("detecta la mención sin distinguir mayúsculas", () => {
    expect(hasPlanMention("@plan revisa la topología")).toBe(true);
    expect(hasPlanMention("revisa la topología @PLAN")).toBe(true);
    expect(hasPlanMention("revisa la topología")).toBe(false);
  });

  it("NO interpreta `plan` como nombre de dispositivo (reservada)", () => {
    // Una mención reservada jamás se resuelve como dispositivo: sin esto, un equipo
    // llamado "plan" absorbería la mención y el turno no entraría en modo planificación.
    expect(extractMentions("@plan y @router1")).toContain("plan");
    expect(extractMention("@plan")).toBeNull();
    expect(extractMention("@plan y @router1")).toBe("router1");
  });

  it("no se activa con un prefijo distinto (@plans, planificador)", () => {
    expect(hasPlanMention("@plans revisa")).toBe(false);
    expect(hasPlanMention("usa el planificador")).toBe(false);
    expect(extractMention("@plans")).toBe("plans");
  });

  it("convive con @rag, @web y @skill en el mismo mensaje", () => {
    const content = "@plan @skill:ospf con @rag y @web sobre @router1";
    expect(hasPlanMention(content)).toBe(true);
    expect(extractSkillMention(content)).toBe("ospf");
    expect(hasRagMention(content)).toBe(true);
    expect(hasWebMention(content)).toBe(true);
    expect(extractMention(content)).toBe("router1");
  });
});

describe("@skill:<slug>", () => {
  it("extrae el slug de la skill solicitada", () => {
    expect(extractSkillMention("usa @skill:configurar-ospf-area-0")).toBe(
      "configurar-ospf-area-0",
    );
    expect(extractSkillMention("@SKILL:Backup-Config")).toBe("backup-config");
  });

  it("devuelve null si no hay mención de skill", () => {
    expect(extractSkillMention("configura @router1")).toBeNull();
    expect(extractSkillMention("usa @skill sin dos puntos")).toBeNull();
    expect(extractSkillMention("")).toBeNull();
  });

  it("NO interpreta `skill` como nombre de dispositivo", () => {
    
    
    const tokens = extractMentions("usa @skill:ospf y @router1");
    expect(tokens).toContain("skill");
    expect(extractMention("usa @skill:ospf")).toBeNull();
    
    expect(extractMention("usa @skill:ospf y @router1")).toBe("router1");
  });

  it("convive con @rag y @web en el mismo mensaje", () => {
    const content = "@skill:ospf con @rag y @web en @router1";
    expect(extractSkillMention(content)).toBe("ospf");
    expect(hasRagMention(content)).toBe(true);
    expect(hasWebMention(content)).toBe(true);
    expect(extractMention(content)).toBe("router1");
  });
});

describe("extracción de menciones", () => {
  it("devuelve todas las menciones en orden", () => {
    expect(extractMentions("@uno @dos-tres @cuatro.com")).toEqual([
      "uno",
      "dos-tres",
      "cuatro.com",
    ]);
  });

  it("tolera contenido vacío o nulo", () => {
    expect(extractMentions("")).toEqual([]);
    expect(extractMention("sin menciones")).toBeNull();
  });
});
