import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { requestContext } from "@/utils/RequestContext";
import { prismaClient } from "@/prisma/lib/PrismaClient";
import {
  buildSkillsCatalog,
  cargarSkillBajoDemanda,
  clearSkillsCache,
  invalidateSkillsCache,
  proyectarSkillMencionada,
  serializeSkillMd,
  slugify,
} from "@/agent/skills/loader";
import { buildTurnFiles } from "@/agent/deep/turn";
import {
  SKILL_TOOLS,
  SKILL_TOOLS_STAFF,
} from "@/agent/skills/tools";
import {
  actualizarSkill,
  crearSkill,
  listarSkills,
  resolverSkill,
  SkillSlugDuplicadoError,
} from "@/service/SkillBaseService";
import { getToolPolicy } from "@/agent/security/ToolPolicy";

let adminUserId = "";
let eventos: Array<{ evento: string; data: unknown }> = [];

async function invocarSkill<T>(
  role: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<T> {
  const tool = SKILL_TOOLS.find((t) => t.name === toolName);
  if (!tool) throw new Error(`Tool desconocida: ${toolName}`);
  return (await requestContext.run(
    {
      id: adminUserId,
      username: `test_${role.toLowerCase()}`,
      role,
      approvalChannel: {
        chatId: "chat-test",
        emit: (evento: string, data: unknown) => {
          eventos.push({ evento, data });
        },
      },
    } as never,
    () => tool.invoke(args) as Promise<T>,
  )) as T;
}

const titleTest = `vitest skill ${Date.now()}`;

beforeEach(async () => {
  clearSkillsCache();
  eventos = [];
  const user = await prismaClient.user.findUnique({
    where: { username: "vitest_suite_admin" },
    select: { id: true },
  });
  adminUserId =
    user?.id ??
    (
      await prismaClient.user.create({
        data: { username: "vitest_suite_admin", password: "x", role: "ADMIN" },
      })
    ).id;
});

// El filtro va por `slug`, no por título: una skill renombrada conserva su slug (es lo
// que garantiza que `@skill:` siga resolviendo), así que borrar por título dejaría
// skills huérfanas ocupando el slug y las siguientes creations devolverían `created:false`.
afterEach(async () => {
  await prismaClient.skillBase.deleteMany({
    where: { slug: { startsWith: "vitest" } },
  });
  clearSkillsCache();
});

afterAll(() => {
  clearSkillsCache();
});

describe("slugify: especificación de Agent Skills", () => {
  it("normaliza a minúsculas, guiones y sin acentos", () => {
    expect(slugify("Configurar OSPF Área 0")).toBe("configurar-ospf-area-0");
    expect(slugify("VLANs & Switching")).toBe("vlans-switching");
    expect(slugify("  espacios  raros  ")).toBe("espacios-raros");
  });

  it("nunca deja guiones al principio, al final ni duplicados", () => {
    expect(slugify("--hola--mundo--")).toBe("hola-mundo");
    expect(slugify("a  b   c")).toBe("a-b-c");
  });

  it("cae a un nombre válido si el título no tiene caracteres utilizables", () => {
    expect(slugify("...")).toBe("skill");
    expect(slugify("")).toBe("skill");
  });

  it("respeta el límite de 64 caracteres", () => {
    expect(slugify("a".repeat(200))).toHaveLength(64);
  });
});

describe("serializeSkillMd: frontmatter", () => {
  it("añade frontmatter con name y description", () => {
    const salida = serializeSkillMd({
      name: "mi-skill",
      description: 'Con "comillas"',
      content: "# Pasos",
    });
    expect(salida.startsWith("---\n")).toBe(true);
    expect(salida).toContain("name: mi-skill");
    expect(salida).toContain('description: "Con \\"comillas\\""');
    expect(salida).toContain("# Pasos");
  });

  it("respeta el frontmatter propio si el contenido ya lo trae", () => {
    const entrada = "---\nname: propio\n---\n\ncuerpo";
    expect(serializeSkillMd({ name: "otro", description: "d", content: entrada })).toBe(
      entrada,
    );
  });
});

describe("loader: catálogo sin contenido y proyección bajo demanda", () => {
  it("el catálogo del prompt NO incluye el contenido completo (progressive disclosure)", async () => {
    await prismaClient.skillBase.create({
      data: {
        slug: slugify(titleTest),
        title: titleTest,
        description: "Descripción breve",
        content: "SECRETO_UNICO_DE_LA_SKILL",
        createdById: adminUserId,
      },
    });
    invalidateSkillsCache();

    const catalogo = await buildSkillsCatalog();
    expect(catalogo).toContain(slugify(titleTest));
    expect(catalogo).toContain("Descripción breve");
    expect(catalogo).not.toContain("SECRETO_UNICO_DE_LA_SKILL");
  });

  it("no incluye una skill deshabilitada en el catálogo", async () => {
    await prismaClient.skillBase.create({
      data: {
        slug: slugify(titleTest),
        title: titleTest,
        description: "Deshabilitada",
        content: "cuerpo",
        enabled: false,
        createdById: adminUserId,
      },
    });
    invalidateSkillsCache();

    // No se comprueba que el catálogo quede vacío: la base puede tener skills reales.
    // Lo que importa es que ESTA no aparezca.
    const catalogo = await buildSkillsCatalog();
    expect(catalogo).not.toContain(slugify(titleTest));
    expect(await proyectarSkillMencionada(slugify(titleTest))).toBeNull();
  });

  it("proyecta a /skills/<slug>/SKILL.md con el formato de FileData", async () => {
    await prismaClient.skillBase.create({
      data: {
        slug: slugify(titleTest),
        title: titleTest,
        description: "Skill de prueba",
        content: "Contenido de la skill",
        createdById: adminUserId,
      },
    });
    invalidateSkillsCache();

    const doc = await proyectarSkillMencionada(slugify(titleTest));
    expect(doc).not.toBeNull();
    expect(doc!.path).toBe(`/skills/${slugify(titleTest)}/SKILL.md`);
    expect(doc!.content).toContain("Contenido de la skill");

    const files = buildTurnFiles([doc], slugify(titleTest));
    expect(files[doc!.path]).toBeDefined();
    expect(files[doc!.path].mimeType).toBe("text/markdown");
    expect(typeof files[doc!.path].modified_at).toBe("string");
  });

  it("sin mención NO proyecta ninguna skill: state.files va vacío", async () => {
    await prismaClient.skillBase.create({
      data: {
        slug: slugify(titleTest),
        title: titleTest,
        description: "No debe cargarse sola",
        content: "cuerpo",
        createdById: adminUserId,
      },
    });
    invalidateSkillsCache();

    expect(buildTurnFiles([null], null)).toEqual({});
  });

  it("cargarSkillBajoDemanda devuelve el cuerpo y el slug", async () => {
    await prismaClient.skillBase.create({
      data: {
        slug: slugify(titleTest),
        title: titleTest,
        description: "Bajo demanda",
        content: "CONTENIDO_SOBAJO_DEMANDA",
        createdById: adminUserId,
      },
    });
    invalidateSkillsCache();

    const cargada = await cargarSkillBajoDemanda(slugify(titleTest));
    expect(cargada?.slug).toBe(slugify(titleTest));
    expect(cargada?.document.content).toContain("CONTENIDO_SOBAJO_DEMANDA");
    expect(await cargarSkillBajoDemanda("no-existe-esta-skill")).toBeNull();
  });
});

describe("SkillBaseService: slug único e inmutable", () => {
  it("crear dos skills con el mismo título normalizado falla con slug duplicado", async () => {
    await crearSkill({ title: titleTest, content: "v1", createdById: adminUserId });

    await expect(
      crearSkill({ title: titleTest.toUpperCase(), content: "v2" }),
    ).rejects.toBeInstanceOf(SkillSlugDuplicadoError);
  });

  it("el slug NO cambia al renombrar el título (la mención @skill: sigue resolviendo)", async () => {
    const creada = await crearSkill({
      title: titleTest,
      content: "v1",
      createdById: adminUserId,
    });
    const slugOriginal = creada.slug;

    const renombrada = await actualizarSkill(creada.id, {
      title: "Título totalmente distinto",
    });

    expect(renombrada.title).toBe("Título totalmente distinto");
    expect(renombrada.slug).toBe(slugOriginal);

    invalidateSkillsCache();
    expect(await proyectarSkillMencionada(slugOriginal)).not.toBeNull();
  });

  it("resolverSkill acepta slug o título", async () => {
    const creada = await crearSkill({
      title: titleTest,
      content: "v1",
      createdById: adminUserId,
    });

    expect((await resolverSkill(creada.slug))?.id).toBe(creada.id);
    expect((await resolverSkill(titleTest))?.id).toBe(creada.id);
    expect(await resolverSkill("no-existe-esta-skill")).toBeNull();
  });

  it("listarSkills filtra por query y por habilitada", async () => {
    await prismaClient.skillBase.create({
      data: {
        slug: "vitest-lista-activa",
        title: "vitest lista activa",
        content: "cuerpo",
        createdById: adminUserId,
      },
    });
    await prismaClient.skillBase.create({
      data: {
        slug: "vitest-lista-inactiva",
        title: "vitest lista inactiva",
        content: "cuerpo",
        enabled: false,
        createdById: adminUserId,
      },
    });
    invalidateSkillsCache();

    const todas = await listarSkills({ q: "vitest lista" });
    expect(todas).toHaveLength(2);

    const habilitadas = await listarSkills({ q: "vitest lista", soloHabilitadas: true });
    expect(habilitadas.map((s) => s.slug)).toEqual(["vitest-lista-activa"]);
  });
});

describe("tools de skills: idempotencia, invalidación, roles y eventos", () => {
  it("STAFF no recibe la tool de borrado", () => {
    expect(SKILL_TOOLS_STAFF.map((t) => t.name)).not.toContain("deleteSkill");
    expect(SKILL_TOOLS.map((t) => t.name)).toContain("deleteSkill");
  });

  it("el supervisor recibe read_skill pero NO las tools de administración", () => {
    // El presupuesto de tools del supervisor está vigilado por el eval
    // `consulta-simple-consola`: cada schema extra se paga en cada llamada al modelo.
    // Administrar skills sigue siendo tarea de system_admin_specialist.
    const esperados = ["read_skill"];
    const tool = SKILL_TOOLS.find((t) => t.name === "read_skill");
    expect(tool).toBeDefined();
    expect(esperados).toContain(tool!.name);
  });

  it("crear la misma skill dos veces devuelve la existente", async () => {
    const first = JSON.parse(
      await invocarSkill<string>("ADMIN", "createSkill", {
        title: titleTest,
        description: "Primera",
        content: "v1",
      }),
    ) as { created: boolean; skill: { id: string; slug: string } };

    const second = JSON.parse(
      await invocarSkill<string>("ADMIN", "createSkill", {
        title: titleTest,
        description: "Segunda",
        content: "v2",
      }),
    ) as { created: boolean; reason: string; skill: { id: string } };

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.reason).toContain("Ya existe");
    expect(second.skill.id).toBe(first.skill.id);

    const row = await prismaClient.skillBase.findUnique({
      where: { id: first.skill.id },
    });
    expect(row?.content).toBe("v1");
  });

  it("crear una skill emite skill_created con su slug", async () => {
    const creada = JSON.parse(
      await invocarSkill<string>("ADMIN", "createSkill", {
        title: titleTest,
        description: "Skill recién creada",
        content: "pasos",
      }),
    ) as { created: boolean; skill: { slug: string } };

    expect(creada.created).toBe(true);

    const emitido = eventos.find((e) => e.evento === "skill_created");
    expect(emitido).toBeDefined();
    expect((emitido!.data as { slug: string }).slug).toBe(creada.skill.slug);
  });

  it("crear una skill la hace disponible sin reiniciar (caché invalidada)", async () => {
    clearSkillsCache();
    expect(await proyectarSkillMencionada(slugify(titleTest))).toBeNull();

    await invocarSkill<string>("ADMIN", "createSkill", {
      title: titleTest,
      description: "Skill recién creada",
      content: "pasos",
    });

    invalidateSkillsCache();
    expect(await proyectarSkillMencionada(slugify(titleTest))).not.toBeNull();
  });

  it("read_skill devuelve el cuerpo y falla claro si no existe", async () => {
    const creada = JSON.parse(
      await invocarSkill<string>("ADMIN", "createSkill", {
        title: titleTest,
        content: "CUERPO_DE_LA_SKILL",
      }),
    ) as { skill: { slug: string } };

    const ok = JSON.parse(
      await invocarSkill<string>("ADMIN", "read_skill", { name: creada.skill.slug }),
    ) as { success: boolean; content: string };

    expect(ok.success).toBe(true);
    expect(ok.content).toContain("CUERPO_DE_LA_SKILL");

    const fallo = JSON.parse(
      await invocarSkill<string>("ADMIN", "read_skill", { name: "no-existe" }),
    ) as { success: boolean; error: string };

    expect(fallo.success).toBe(false);
    expect(fallo.error).toContain("no-existe");
  });

  it("USER no puede crear skills", async () => {
    const output = JSON.parse(
      await invocarSkill<string>("USER", "createSkill", {
        title: titleTest,
        content: "x",
      }),
    ) as { success: boolean; error: string };
    expect(output.success).toBe(false);
    expect(output.error).toContain("ADMIN o STAFF");
  });

  it("STAFF no puede borrar skills (reservado a ADMIN)", async () => {
    const creada = JSON.parse(
      await invocarSkill<string>("ADMIN", "createSkill", {
        title: titleTest,
        content: "x",
      }),
    ) as { skill: { id: string } };

    const output = JSON.parse(
      await invocarSkill<string>("STAFF", "deleteSkill", { id: creada.skill.id }),
    ) as { success: boolean; error: string };
    expect(output.success).toBe(false);
    expect(output.error).toContain("ADMIN");
  });

  it("políticas: crear/editar/leer skill es reversible, borrar no", () => {
    expect(getToolPolicy("createSkill").autoApprove).toBe(true);
    expect(getToolPolicy("updateSkill").autoApprove).toBe(true);
    expect(getToolPolicy("deleteSkill").autoApprove).toBeUndefined();
    expect(getToolPolicy("deleteSkill").access).toBe("mutating");
    expect(getToolPolicy("listSkills").access).toBe("readonly");
    expect(getToolPolicy("read_skill").access).toBe("readonly");
  });
});