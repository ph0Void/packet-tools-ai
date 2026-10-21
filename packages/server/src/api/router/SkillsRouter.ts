import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "@/middleware/auth.middleware";
import { requireRoles } from "@/middleware/role.middleware";
import { Role } from "@/prisma/generated/enums";
import {
  actualizarSkill,
  crearSkill,
  eliminarSkill,
  listarSkills,
  listarSkillsResumidas,
  obtenerSkillPorId,
  SkillNoEncontradaError,
  SkillSlugDuplicadoError,
} from "@/service/SkillBaseService";
import { invalidateSkillsCache } from "@/agent/skills/loader";

const router = Router();

router.use(authMiddleware);

const cuerpoCrear = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1024).nullish(),
  content: z.string().min(1).max(100_000),
});

const cuerpoActualizar = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1024).nullish(),
  content: z.string().min(1).max(100_000).optional(),
  enabled: z.boolean().optional(),
});

/**
 * Listado. `?q=` filtra por título. `?resumidas=1` omite `content`, que es lo que
 * consume el autocomplete del chat: el catálogo del agente sólo necesita nombre y
 * descripción, no los cuerpos completos.
 */
router.get("/", async (req, res, next) => {
  try {
    const query = z.string().max(200).optional().parse(req.query.q ?? undefined);
    const resumidas = z
      .string()
      .optional()
      .parse(req.query.resumidas ?? undefined);

    if (resumidas === "1" || resumidas === "true") {
      const resumen = await listarSkillsResumidas({ q: query });
      res.json({ success: true, message: "Skills obtenidas", data: resumen });
      return;
    }

    const rows = await listarSkills({ q: query });
    res.json({ success: true, message: "Skills obtenidas", data: rows });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const row = await obtenerSkillPorId(id);
    if (!row) {
      res.status(404).json({ success: false, message: "Skill no encontrada", data: null });
      return;
    }
    res.json({ success: true, message: "Skill obtenida", data: row });
  } catch (error) {
    next(error);
  }
});

router.post("/", requireRoles(Role.ADMIN, Role.STAFF), async (req, res, next) => {
  try {
    const body = cuerpoCrear.parse(req.body);

    const row = await crearSkill({
      title: body.title,
      description: body.description ?? null,
      content: body.content,
      createdById: req.user!.id,
    });

    invalidateSkillsCache();
    res.status(201).json({ success: true, message: "Skill creada", data: row });
  } catch (error) {
    if (error instanceof SkillSlugDuplicadoError) {
      res.status(409).json({ success: false, message: error.message, data: null });
      return;
    }
    next(error);
  }
});

router.put("/:id", requireRoles(Role.ADMIN, Role.STAFF), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const body = cuerpoActualizar.parse(req.body);

    const row = await actualizarSkill(id, {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined
        ? { description: body.description ?? null }
        : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
      ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
    });

    invalidateSkillsCache();
    res.json({ success: true, message: "Skill actualizada", data: row });
  } catch (error) {
    if (error instanceof SkillNoEncontradaError) {
      res.status(404).json({ success: false, message: error.message, data: null });
      return;
    }
    next(error);
  }
});

router.delete("/:id", requireRoles(Role.ADMIN), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    await eliminarSkill(id);
    invalidateSkillsCache();
    res.json({ success: true, message: "Skill eliminada", data: null });
  } catch (error) {
    if (error instanceof SkillNoEncontradaError) {
      res.status(404).json({ success: false, message: error.message, data: null });
      return;
    }
    next(error);
  }
});

export default router;