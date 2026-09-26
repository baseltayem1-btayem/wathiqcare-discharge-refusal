const fs = require("fs");

fs.rmSync(".next", { recursive: true, force: true });
fs.cpSync("apps/web/.next", ".next", { recursive: true });

console.log("Copied apps/web/.next to .next for Vercel deployment.");
