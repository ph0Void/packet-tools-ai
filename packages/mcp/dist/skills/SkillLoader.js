"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = slugify;
exports.loadSkillsFromDisk = loadSkillsFromDisk;
exports.loadSkillsFromDatabase = loadSkillsFromDatabase;
exports.loadAllSkills = loadAllSkills;
exports.findSkill = findSkill;
exports.ensureSkillsFolder = ensureSkillsFolder;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const EnvConfig_1 = require("../config/EnvConfig.js");
const PrismaClient_1 = require("../prisma/lib/PrismaClient.js");
const Logger_1 = require("../utils/Logger.js");
function slugify(text) {
    return (text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64) || "skill");
}
function parseFrontmatter(content) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
    if (!match)
        return { meta: {}, body: content };
    const meta = {};
    for (const line of match[1].split(/\r?\n/)) {
        const pair = /^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
        if (!pair)
            continue;
        meta[pair[1].toLowerCase()] = pair[2].trim().replace(/^["']|["']$/g, "");
    }
    return { meta, body: content.slice(match[0].length) };
}
function titleFromBody(body, slug) {
    const heading = /^#\s+(.+)$/m.exec(body);
    return heading ? heading[1].trim() : slug;
}
async function loadSkillsFromDisk() {
    const folder = EnvConfig_1.envConfig.MCP_SKILLS_DIR;
    let files;
    try {
        files = await promises_1.default.readdir(folder);
    }
    catch {
        return [];
    }
    const skills = [];
    for (const name of files) {
        if (!/\.(md|markdown|txt)$/i.test(name))
            continue;
        const filePath = node_path_1.default.join(folder, name);
        try {
            const content = await promises_1.default.readFile(filePath, "utf8");
            const { meta, body } = parseFrontmatter(content);
            const slug = meta.slug?.trim() || slugify(name.replace(/\.(md|markdown|txt)$/i, ""));
            skills.push({
                slug,
                title: meta.title?.trim() || titleFromBody(body, slug),
                description: meta.description?.trim() || null,
                content: body.trim(),
                source: "file",
                filePath,
            });
        }
        catch (error) {
            Logger_1.Logger.warning(`Could not read skill '${name}': ${String(error)}`);
        }
    }
    return skills;
}
async function loadSkillsFromDatabase() {
    try {
        const rows = await PrismaClient_1.prismaClient.skillMcp.findMany({
            where: { enabled: true },
            orderBy: { slug: "asc" },
        });
        return rows.map((row) => ({
            slug: row.slug,
            title: row.title,
            description: row.description,
            content: row.content,
            source: "database",
        }));
    }
    catch (error) {
        Logger_1.Logger.debug(`Could not read skills from the database: ${String(error)}`);
        return [];
    }
}
async function loadAllSkills() {
    const [fromDisk, fromDatabase] = await Promise.all([
        loadSkillsFromDisk(),
        loadSkillsFromDatabase(),
    ]);
    const bySlug = new Map();
    for (const skill of fromDisk)
        bySlug.set(skill.slug, skill);
    for (const skill of fromDatabase)
        bySlug.set(skill.slug, skill);
    return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}
async function findSkill(reference) {
    const query = reference.trim().toLowerCase();
    const skills = await loadAllSkills();
    return (skills.find((skill) => skill.slug.toLowerCase() === query) ??
        skills.find((skill) => skill.title.toLowerCase() === query) ??
        null);
}
async function ensureSkillsFolder() {
    await promises_1.default.mkdir(EnvConfig_1.envConfig.MCP_SKILLS_DIR, { recursive: true });
    return EnvConfig_1.envConfig.MCP_SKILLS_DIR;
}
//# sourceMappingURL=SkillLoader.js.map