#!/usr/bin/env node
/**
 * Replace @/lib/server/prisma-enums imports with @prisma/client $Enums
 * in apps/web/src/lib/server and apps/web/src/platform files.
 * This is a typing-safe refactor that reduces runtime-critical enum proxy debt.
 */
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const TARGET_DIRS = ["apps/web/src/lib/server", "apps/web/src/platform"];
const IMPORT_RE = /import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/server\/prisma-enums["'];?/g;

async function walk(dir, files = []) {
  const entries = await readdir(dir);
  for (const entry of entries) {
    const path = join(dir, entry);
    const s = await stat(path);
    if (s.isDirectory()) {
      await walk(path, files);
    } else if (path.endsWith(".ts") || path.endsWith(".tsx")) {
      files.push(path);
    }
  }
  return files;
}

function splitNames(importBody) {
  return importBody
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isUsedAsValue(source, name) {
  // Name.MEMBER, Object.values(Name), Object.keys(Name), Name[] would be type
  const valuePattern = new RegExp(`\\b${name}\\s*\\.\\s*[A-Z_][A-Za-z0-9_]*|Object\\.(?:values|keys|entries)\\s*\\(\\s*${name}\\s*\\)`, "g");
  return valuePattern.test(source);
}

function transformFile(source) {
  let changed = false;
  let newSource = source;

  newSource = newSource.replace(IMPORT_RE, (match, importBody) => {
    changed = true;
    const names = splitNames(importBody);
    const valueNames = names.filter((n) => isUsedAsValue(source, n));
    const typeOnlyNames = names.filter((n) => !valueNames.includes(n));

    const parts = ["$Enums"];
    for (const n of typeOnlyNames) {
      parts.push(`type ${n}`);
    }
    for (const n of valueNames) {
      // If also used as a type, import both type and value is not needed;
      // importing type Name and using $Enums.Name for values works.
      // But if used as type too, we still need the type import.
      const usedAsType = new RegExp(`\\b${n}\\b`).test(source.replace(new RegExp(`\\b${n}\\s*\\.\\s*[A-Z_][A-Za-z0-9_]*`, "g"), ""));
      if (usedAsType || typeOnlyNames.includes(n)) {
        // It's already imported as type or we need to add it
      }
    }
    // Simpler: import $Enums plus type for every name that appears as a type annotation
    const typeImports = names.filter((n) => {
      // Remove value usages and see if name still appears (type usage)
      const withoutValues = source.replace(new RegExp(`\\b${n}\\s*\\.\\s*[A-Z_][A-Za-z0-9_]*`, "g"), "");
      return new RegExp(`\\b${n}\\b`).test(withoutValues);
    });

    const importParts = ["$Enums"];
    for (const n of typeImports) {
      importParts.push(`type ${n}`);
    }
    return `import { ${importParts.join(", ")} } from "@prisma/client";`;
  });

  // Replace value usages Name.MEMBER -> $Enums.Name.MEMBER
  // We need to do this for all names that were imported as values.
  // Re-find imports to get names.
  const imports = [...source.matchAll(IMPORT_RE)];
  for (const [, importBody] of imports) {
    const names = splitNames(importBody);
    for (const name of names) {
      if (isUsedAsValue(source, name)) {
        newSource = newSource.replace(
          new RegExp(`\\b${name}\\s*\\.\\s*([A-Z_][A-Za-z0-9_]*)`, "g"),
          `$Enums.${name}.$1`
        );
        newSource = newSource.replace(
          new RegExp(`Object\\.(values|keys|entries)\\s*\\(\\s*${name}\\s*\\)`, "g"),
          `Object.$1($Enums.${name})`
        );
      }
    }
  }

  return { source: newSource, changed };
}

async function main() {
  const files = [];
  for (const dir of TARGET_DIRS) {
    files.push(...await walk(dir));
  }

  let modified = 0;
  for (const file of files) {
    const source = await readFile(file, "utf-8");
    if (!IMPORT_RE.test(source)) continue;
    IMPORT_RE.lastIndex = 0;
    const { source: newSource, changed } = transformFile(source);
    if (changed && newSource !== source) {
      await writeFile(file, newSource, "utf-8");
      console.log("modified:", file);
      modified++;
    }
  }
  console.log(`Modified ${modified} files.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
