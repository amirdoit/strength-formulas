// npm only packs files inside the package directory. Copy the repo-level license and notice in at pack time.
import { copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const f of ["LICENSE", "NOTICE.md"]) copyFileSync(path.join(root, f), path.join(process.cwd(), f));
