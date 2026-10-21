

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requestContext } from "@/utils/RequestContext";
import { prismaClient } from "@/prisma/lib/PrismaClient";
import { SKILL_TOOLS } from "@/agent/skills/tools";
import { SYSTEM_ADMIN_TOOLS } from "@/agent/systemAdmin/Tool";
import { invalidateSkillsCache, buildSkillsCatalog, slugify } from "@/agent/skills/loader";

const sufijo = Date.now();
const skillTitle = `vitest e2e ospf ${sufijo}`;
const cronName = `vitest e2e cron ${sufijo}`;
const deviceName = `COM6-${sufijo}`;

let adminUserId = "";
let deviceId = "";


async function turn<T>(
  role: string,
  tool: { name: string; invoke: (a: never) => Promise<unknown> },
  args: Record<string, unknown>,
): Promise<T> {
  return (await requestContext.run(
    {
      id: adminUserId,
      username: `e2e_${role.toLowerCase()}`,
      role,
      approvalChannel: { chatId: "chat-e2e", emit: () => {} },
    } as never,
    () => tool.invoke(args as never) as Promise<T>,
  )) as T;
}

const skillTool = (name: string) => {
  const tool = SKILL_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool de skills desconocida: ${name}`);
  return tool;
};

beforeEach(async () => {
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

  deviceId = (
    await prismaClient.deviceProviders.create({
      data: { name: deviceName, protocol: "SERIAL", serialPort: "COM6" },
    })
  ).id;
  invalidateSkillsCache();
});

afterEach(async () => {
  // Por slug: una skill renombrada lo conserva, así que borrar por título dejaría
  // huérfanas ocupando el identificador.
  await prismaClient.skillBase.deleteMany({
    where: { slug: { startsWith: "vitest-e2e" } },
  });
  await prismaClient.cronJob.deleteMany({ where: { name: cronName } });
  await prismaClient.deviceProviders.deleteMany({ where: { name: deviceName } });
  await prismaClient.log.deleteMany({ where: { level: "ADMIN_ACTION" } });
  invalidateSkillsCache();
});

describe("E2E: crear una skill desde el chat", () => {
  it("persiste la skill y la publica en el catálogo del supervisor", async () => {
    const result = JSON.parse(
      await turn<string>(
        "STAFF",
        SKILL_TOOLS.find((t) => t.name === "createSkill")!,
        {
          title: skillTitle,
          description: "Configurar OSPF área 0 en un router",
          content:
            "# Cuándo usarla\n\nCuando el router tiene OSPF.\n\n# Pasos\n\n1. router ospf 1\n2. network 10.0.0.0 0.255.255.255 area 0\n3. Verificar con show ip ospf neighbor",
        },
      ),
) as { success: boolean; created: boolean; skill: { id: string; slug: string } };

    expect(result.success).toBe(true);
    expect(result.created).toBe(true);


    const row = await prismaClient.skillBase.findUnique({
      where: { id: result.skill.id },
    });
    expect(row?.title).toBe(skillTitle);
    expect(row?.slug).toBe(slugify(skillTitle));
    expect(row?.enabled).toBe(true);

    // La skill vive en su tabla: nada debe haber quedado en KnowledgeBase.
    const enKnowledge = await prismaClient.knowledgeBase.count({
      where: { title: skillTitle },
    });
    expect(enKnowledge).toBe(0);


    const catalogo = await buildSkillsCatalog();
    expect(catalogo).toContain(result.skill.slug);
    expect(catalogo).toContain("Configurar OSPF área 0 en un router");
  });

  it("el cuerpo NO entra en el catálogo, sólo el slug y la descripción", async () => {
    await turn<string>(
      "STAFF",
      SKILL_TOOLS.find((t) => t.name === "createSkill")!,
      {
        title: skillTitle,
        description: "Configurar OSPF área 0 en un router",
        content: "PASO_SECRETO_NO_DEBE_APARECER_EN_EL_CATALOGO",
      },
    );

    const catalogo = await buildSkillsCatalog();
    expect(catalogo).not.toContain("PASO_SECRETO_NO_DEBE_APARECER_EN_EL_CATALOGO");
  });
});

describe("E2E: programar un cronjob desde el chat", () => {
  it("crea el cronjob diario a las 3 AM con su prompt", async () => {
    const result = JSON.parse(
      await turn<string>(
        "STAFF",
        SYSTEM_ADMIN_TOOLS.find((t) => t.name === "createCronJob")!,
        {
          name: cronName,
          description: "Auditoría nocturna del router",
          cronExpression: "0 3 * * *",
          actionType: "INTELLIGENT",
          prompt: "Audita el estado del router y resume los vecinos OSPF caídos.",
        },
      ),
    ) as { success: boolean; created: boolean; job: { id: string; nextRun: string | null } };

    expect(result.success).toBe(true);
    expect(result.created).toBe(true);

    const row = await prismaClient.cronJob.findUnique({
      where: { id: result.job.id },
    });
    expect(row?.cronExpression).toBe("0 3 * * *");
    expect(row?.actionType).toBe("INTELLIGENT");
    expect(row?.prompt).toContain("OSPF");
    expect(row?.isActive).toBe(true);

    expect(row?.nextRun).toBeTruthy();
    expect(new Date(row!.nextRun!).getTime()).toBeGreaterThan(Date.now());
  });

  it("permite activar y desactivar sin recrear", async () => {
    const created = JSON.parse(
      await turn<string>(
        "ADMIN",
        SYSTEM_ADMIN_TOOLS.find((t) => t.name === "createCronJob")!,
        { name: cronName, cronExpression: "0 3 * * *", actionType: "STANDARD" },
      ),
    ) as { job: { id: string } };

    const off = JSON.parse(
      await turn<string>(
        "ADMIN",
        SYSTEM_ADMIN_TOOLS.find((t) => t.name === "toggleCronJob")!,
        { id: created.job.id, isActive: false },
      ),
    ) as { success: boolean; job: { isActive: boolean } };
    expect(off.success).toBe(true);
    expect(off.job.isActive).toBe(false);

    const on = JSON.parse(
      await turn<string>(
        "ADMIN",
        SYSTEM_ADMIN_TOOLS.find((t) => t.name === "toggleCronJob")!,
        { id: created.job.id, isActive: true },
      ),
    ) as { job: { isActive: boolean } };
    expect(on.job.isActive).toBe(true);
  });
});

describe("E2E: eliminar una conexión desde el chat", () => {
  it("STAFF no puede eliminar (reservado a ADMIN)", async () => {
    const result = JSON.parse(
      await turn<string>(
        "STAFF",
        SYSTEM_ADMIN_TOOLS.find((t) => t.name === "deleteDeviceProvider")!,
        { id: deviceId },
      ),
    ) as { success: boolean; error: string };

    expect(result.success).toBe(false);
    expect(result.error).toContain("ADMIN");

    const sigue = await prismaClient.deviceProviders.findUnique({
      where: { id: deviceId },
    });
    expect(sigue).not.toBeNull();
  });

  it("ADMIN sí elimina y queda auditado", async () => {
    const result = JSON.parse(
      await turn<string>(
        "ADMIN",
        SYSTEM_ADMIN_TOOLS.find((t) => t.name === "deleteDeviceProvider")!,
        { id: deviceId },
      ),
    ) as { success: boolean; deletedId: string };

    expect(result.success).toBe(true);
    const borrada = await prismaClient.deviceProviders.findUnique({
      where: { id: deviceId },
    });
    expect(borrada).toBeNull();

    const auditoria = await prismaClient.log.findFirst({
      where: { level: "ADMIN_ACTION" },
      orderBy: { createdAt: "desc" },
    });
    expect(auditoria?.title).toContain("deleteDeviceProvider");
    expect(auditoria?.topologyId).toBeNull();
  });
});

describe("E2E: métricas del sistema", () => {
  it("getSystemMetrics cuenta skills y dispositivos reales", async () => {
    await turn<string>(
      "ADMIN",
      SKILL_TOOLS.find((t) => t.name === "createSkill")!,
      { title: skillTitle, content: "contenido" },
    );
    const result = JSON.parse(
      await turn<string>(
        "STAFF",
        SYSTEM_ADMIN_TOOLS.find((t) => t.name === "getSystemMetrics")!,
        {},
      ),
    ) as {
      success: boolean;
      metrics: { skills: number; devices: number; users: number };
    };

    expect(result.success).toBe(true);
    expect(result.metrics.skills).toBeGreaterThanOrEqual(1);
    expect(result.metrics.devices).toBeGreaterThanOrEqual(1);
    expect(result.metrics.users).toBeGreaterThan(0);
  });
});
