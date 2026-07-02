import fs from 'node:fs';
function loadEnvFile(p){ if(!fs.existsSync(p)) return; const r=fs.readFileSync(p,'utf8'); for(const line of r.split(/\r?\n/)){ const t=line.trim(); if(!t||t.startsWith('#')) continue; const i=t.indexOf('='); if(i<=0) continue; const k=t.slice(0,i).trim(); let v=t.slice(i+1).trim(); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1); if(typeof process.env[k]==='undefined') process.env[k]=v; }}
loadEnvFile('.env.production.local');
loadEnvFile('.env.local');
loadEnvFile('.env');
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const email = process.argv[2];
if(!email){ console.error('Usage: node scripts/tmp-bypass-reset.mjs <email>'); process.exit(1); }
await prisma.$executeRawUnsafe(`UPDATE users SET password_reset_required = FALSE, last_password_changed_at = NOW() WHERE email = $1`, email);
console.log(`Bypassed password reset for ${email}`);
await prisma.$disconnect();
