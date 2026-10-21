
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(scriptDir, "..");
const dist = path.join(packageRoot, "dist");

function toRelative(fromFile, absoluteTargetPath) {
  let relative = path.relative(path.dirname(fromFile), absoluteTargetPath);
  relative = relative.split(path.sep).join("/");
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative;
}

async function listJsFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir)) {
    const fullPath = path.join(dir, entry);
    const info = await stat(fullPath);
    if (info.isDirectory()) {
      found.push(...(await listJsFiles(fullPath)));
    } else if (entry.endsWith(".js")) {
      found.push(fullPath);
    }
  }
  return found;
}

async function resolveModule(pathWithoutExtension) {
  const asFile = `${pathWithoutExtension}.js`;
  try {
    await stat(asFile);
    return asFile;
  } catch {
  }
  const asIndex = path.join(pathWithoutExtension, "index.js");
  try {
    await stat(asIndex);
    return asIndex;
  } catch {
    return null;
  }
}

async function main() {
  let files;
  try {
    files = await listJsFiles(dist);
  } catch {
    console.error(
      "[rewrite-dist] dist/ does not exist. Run `tsc` before this script.",
    );
    process.exit(1);
  }

  let rewritten = 0;

  for (const file of files) {
    const original = await readFile(file, "utf8");
    let content = original;

    for (const match of [...content.matchAll(/["']@\/([^"']+)["']/g)]) {
      const subpath = match[1];
      const target = await resolveModule(path.join(dist, subpath));
      if (!target) {
        console.warn(
          `[rewrite-dist] Could not resolve "@/ ${subpath}" from ${path.relative(dist, file)}`,
        );
        continue;
      }
      content = content.replace(
        match[0],
        `"${toRelative(file, target)}"`,
      );
    }

    for (const match of [...content.matchAll(/["'](\.\.?\/[^"']+)["']/g)]) {
      const specifier = match[1];
      if (path.extname(specifier)) continue;
      const base = path.resolve(path.dirname(file), specifier);
      const target = await resolveModule(base);
      if (!target) continue;
      content = content.replace(
        `"${specifier}"`,
        `"${toRelative(file, target)}"`,
      );
    }

    if (content !== original) {
      await writeFile(file, content, "utf8");
      rewritten++;
    }
  }

  await writeFile(
    path.join(dist, "package.json"),
    `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `[rewrite-dist] ${rewritten} de ${files.length} archivos reescritos. dist/ listo para 'node dist/app.js'.`,
  );
}

main().catch((error) => {
  console.error("[rewrite-dist] Failed:", error);
  process.exit(1);
});
