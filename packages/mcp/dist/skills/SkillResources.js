"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSkillsAsResources = registerSkillsAsResources;
const SkillLoader_1 = require("./SkillLoader.js");
const Logger_1 = require("../utils/Logger.js");
const SCHEME = "skill://";
function slugFromUri(uri) {
    if (!uri.startsWith(SCHEME))
        return null;
    const slug = uri.slice(SCHEME.length).trim();
    return slug.length > 0 ? slug : null;
}
function registerSkillsAsResources(server) {
    server.registerResource("skills", SCHEME, {
        title: "User skills",
        description: "Instructions written by the user themselves (naming conventions, policies, procedures) that the model must follow.",
        mimeType: "text/markdown",
    }, async (uri) => {
        const slug = slugFromUri(uri.toString());
        if (!slug) {
            return {
                contents: [
                    {
                        uri: uri.toString(),
                        mimeType: "text/plain",
                        text: `Unrecognized URI. The format is ${SCHEME}<slug>.`,
                    },
                ],
            };
        }
        const skills = await (0, SkillLoader_1.loadAllSkills)();
        const skill = skills.find((s) => s.slug === slug);
        if (!skill) {
            const availableSlugs = skills.map((s) => s.slug).join(", ") || "(none)";
            return {
                contents: [
                    {
                        uri: uri.toString(),
                        mimeType: "text/plain",
                        text: `No skill exists with the slug '${slug}'. Available skills: ${availableSlugs}.`,
                    },
                ],
            };
        }
        return {
            contents: [
                {
                    uri: uri.toString(),
                    mimeType: "text/markdown",
                    text: `# ${skill.title}\n\n${skill.content}`,
                },
            ],
        };
    });
    Logger_1.Logger.debug("Skills registered as MCP resources (skill://<slug>).");
}
//# sourceMappingURL=SkillResources.js.map