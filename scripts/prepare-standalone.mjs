import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

if (!existsSync(join(standalone, "server.js"))) {
  console.error("Missing .next/standalone/server.js. Ensure next.config.ts has output: \"standalone\".");
  process.exit(1);
}

const staticSource = join(root, ".next", "static");
const staticTarget = join(standalone, ".next", "static");
if (existsSync(staticSource)) {
  mkdirSync(join(standalone, ".next"), { recursive: true });
  cpSync(staticSource, staticTarget, { recursive: true, force: true });
}

const publicSource = join(root, "public");
const publicTarget = join(standalone, "public");
if (existsSync(publicSource)) {
  cpSync(publicSource, publicTarget, { recursive: true, force: true });
}

console.log("Standalone Next.js bundle prepared.");
