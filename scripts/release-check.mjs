import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const root = path.resolve("dist");
async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(file)));
    else out.push(file);
  }
  return out;
}
const files = await walk(root);
for (const file of files) {
  assert(
    !/ocr|normalized|\.db$|\.pdf$|book_audited|local-book/i.test(
      path.relative(root, file),
    ),
    `Private asset in build: ${file}`,
  );
  if (/\.(js|json|html|css)$/.test(file)) {
    const content = await readFile(file, "utf8");
    assert(
      !/C:\\\\Users|z-library|z-lib\.sk|赢得5分直觉资本/.test(content),
      `Private content in ${file}`,
    );
  }
}
console.log(`Public distribution check passed: ${files.length} files.`);
