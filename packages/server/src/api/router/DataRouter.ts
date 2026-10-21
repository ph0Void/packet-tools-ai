import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { PDFParse } from "pdf-parse";
import { z } from "zod";
import { prismaClient } from "@/prisma/lib/PrismaClient";
import { authMiddleware } from "@/middleware/auth.middleware";
import { requireRoles } from "@/middleware/role.middleware";
import { Role } from "@/prisma/generated/enums";
import { vectorStoreService } from "@/service/VectorStoreService";
import { Logger } from "@/utils/Logger";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const documentsDir = path.resolve(process.cwd(), "uploads", "documents");
const publicDocument = { id: true, title: true, description: true, fileUrl: true, createdAt: true, updatedAt: true } as const;

// Este router es SOLO el RAG de documentos (type=DATA). Las skills del agente viven en su
// propia tabla `SkillBase` y sus rutas están en `./SkillsRouter` (`/api/skills`).
router.use(authMiddleware);

router.get("/", async (_req, res, next) => {
  try {

    const rows = await prismaClient.knowledgeBase.findMany({ where: { type: "DATA" }, select: publicDocument, orderBy: { updatedAt: "desc" } });
    res.json({ success: true, message: "Documentos obtenidos", data: rows });
  } catch (error) { next(error); }
});

router.post("/", requireRoles(Role.ADMIN, Role.STAFF), upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Archivo requerido", data: null });
    const extension = path.extname(req.file.originalname).toLowerCase();
    if (![".pdf", ".txt", ".md"].includes(extension)) return res.status(400).json({ success: false, message: "Solo se permiten PDF, TXT y MD", data: null });
    const title = z.string().min(1).max(200).parse(req.body.title ?? path.basename(req.file.originalname, extension));
    await fs.mkdir(documentsDir, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    const absolutePath = path.join(documentsDir, filename);
    const parser = extension === ".pdf" ? new PDFParse({ data: req.file.buffer }) : null;
    const content = parser ? (await parser.getText()).text : req.file.buffer.toString("utf8");
    if (parser) await parser.destroy();

    if (!content || content.trim() === "") return res.status(400).json({ success: false, message: "El documento no contiene texto extraíble.", data: null });
    await fs.writeFile(absolutePath, req.file.buffer);
    const row = await prismaClient.knowledgeBase.create({ data: { title, content, description: req.file.mimetype, fileUrl: path.join("uploads", "documents", filename).replaceAll("\\", "/"), createdById: req.user!.id }, select: publicDocument });

    let indexed = true;
    let indexError: unknown = null;
    try { await vectorStoreService.indexDocuments([{ id: row.id, title: row.title, content }]); } catch (error) { indexed = false; indexError = error; }
    let message = "Archivo cargado e indexado";
    if (!indexed) {
      const motivo = indexError instanceof Error ? indexError.message : String(indexError);
      Logger.error({ message: "[DataRouter] Falló la indexación del documento cargado", data: { documentId: row.id, error: motivo } });

      message = motivo.includes("EMBEDDING activo")
        ? "Archivo cargado (pendiente de indexación: configura un modelo EMBEDDING activo)"
        : `Archivo cargado, pero la indexación falló: ${motivo}`;
    }
    res.status(201).json({ success: true, message, data: row });
  } catch (error) { next(error); }
});

router.get("/:id/file", async (req, res, next) => {
  try {
    const row = await prismaClient.knowledgeBase.findUnique({ where: { id: String(req.params.id) } });
    if (!row?.fileUrl) return res.status(404).json({ success: false, message: "Archivo no encontrado", data: null });
    const absolutePath = path.resolve(process.cwd(), row.fileUrl);
    await fs.access(absolutePath);
    res.type(row.fileUrl.toLowerCase().endsWith(".pdf") ? "application/pdf" : row.description ?? "text/plain");
    res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(row.title)}`);
    res.sendFile(absolutePath);
  } catch (error) { next(error); }
});

// Fijado a `type: "DATA"`: antes era type-agnostic y, mientras las skills vivían en
// KnowledgeBase, `DELETE /api/data/<idDeSkill>` las borraba sin invalidar la caché del
// agente. Las skills se borran en `DELETE /api/skills/:id`.
router.delete("/:id", requireRoles(Role.ADMIN, Role.STAFF), async (req, res, next) => {
  try {
    const row = await prismaClient.knowledgeBase.findFirst({ where: { id: String(req.params.id), type: "DATA" } });
    if (!row) return res.status(404).json({ success: false, message: "Documento no encontrado", data: null });
    await prismaClient.knowledgeBase.delete({ where: { id: row.id } });
    if (row.fileUrl) await fs.rm(path.resolve(process.cwd(), row.fileUrl), { force: true });
    await vectorStoreService.deleteDocument(row.id);
    res.json({ success: true, message: "Documento eliminado", data: null });
  } catch (error) { next(error); }
});

export default router;
