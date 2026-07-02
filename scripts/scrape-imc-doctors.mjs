#!/usr/bin/env node
/**
 * Scrape the public IMC doctors directory and emit a structured JSON dataset.
 * Source: https://www.imc.med.sa/ar/doctors
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://www.imc.med.sa/ar/doctors";
const CONCURRENCY = 2;
const DELAY_MS = 800;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(pageNum, retries = 3) {
  const url = pageNum === 0 ? BASE_URL : `${BASE_URL}?page=${pageNum}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });
    if (resp.ok) return resp.text();
    if (attempt === retries) {
      throw new Error(`HTTP ${resp.status} for ${url} after ${retries} attempts`);
    }
    console.warn(`  HTTP ${resp.status} for page ${pageNum}, retrying in ${attempt * 2}s...`);
    await sleep(attempt * 2000);
  }
  throw new Error("unreachable");
}

function extractDoctors(html) {
  const cards = [];
  // Split by doctor-listing-card blocks
  const cardRegex = /<div class="doctor-listing-card">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let m;
  while ((m = cardRegex.exec(html)) !== null) {
    const block = m[1];

    const hrefMatch = block.match(/<a href="\/ar\/([^"]+)"/);
    if (!hrefMatch) continue;
    const slug = hrefMatch[1].trim();

    const imgMatch = block.match(/<img\s+[^>]*src="([^"]+)"/);
    const photoRelative = imgMatch ? imgMatch[1].trim() : "";
    const photoUrl = photoRelative ? (photoRelative.startsWith("http") ? photoRelative : `https://www.imc.med.sa${photoRelative}`) : "";

    const nameMatch = block.match(/<h3 class="doctor-card__name" title="([^"]+)">/);
    const nameAr = nameMatch ? nameMatch[1].trim() : "";

    const designationMatch = block.match(/<p class="doctor-card__designation" title="([^"]*)">/);
    const designation = designationMatch ? designationMatch[1].trim() : "";

    const descMatch = block.match(/<p class="doctor-card__description">\s*([\s\S]*?)\s*<\/p>/);
    let specialtyAr = "";
    let departmentAr = "";
    if (descMatch) {
      const lines = descMatch[1]
        .split(/<br\s*\/?>/i)
        .map((l) => l.replace(/<[^>]+>/g, "").trim())
        .filter(Boolean);
      specialtyAr = lines[0] || "";
      departmentAr = lines[1] || "";
    }

    cards.push({
      slug,
      nameAr,
      designation,
      specialtyAr,
      departmentAr,
      photoUrl,
      profileUrl: `https://www.imc.med.sa/ar/${slug}`,
    });
  }
  return cards;
}

function detectLastPage(html) {
  const lastMatch = html.match(/<a href="\?page=([0-9]+)"[^>]*title="[^"]*الأخيرة/);
  if (lastMatch) return parseInt(lastMatch[1], 10);
  const pages = [...html.matchAll(/<a href="\?page=([0-9]+)"/g)].map((x) => parseInt(x[1], 10));
  return pages.length ? Math.max(...pages) : 0;
}

function deriveEnglish(slug) {
  const parts = slug.split("-").filter(Boolean);
  const first = parts[0] || "";
  const last = parts[parts.length - 1] || "";
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return {
    firstName: cap(first),
    lastName: cap(last),
    fullName: [cap(first), cap(last)].filter(Boolean).join(" "),
  };
}

async function main() {
  console.log("Fetching page 0 to detect total pages...");
  const firstHtml = await fetchPage(0);
  const lastPage = detectLastPage(firstHtml);
  console.log(`Detected last page: ${lastPage}`);

  const allCards = [...extractDoctors(firstHtml)];

  for (let i = 1; i <= lastPage; i++) {
    await sleep(DELAY_MS);
    console.log(`Fetching page ${i}/${lastPage}...`);
    try {
      const html = await fetchPage(i);
      const cards = extractDoctors(html);
      allCards.push(...cards);
    } catch (err) {
      console.warn(`  Skipping page ${i}: ${err.message}`);
    }
  }

  console.log(`\nTotal doctor cards scraped: ${allCards.length}`);

  // Deduplicate by slug and derive English names/emails
  const bySlug = new Map();
  const usedEmails = new Set();
  for (const doc of allCards) {
    if (bySlug.has(doc.slug)) continue;
    const en = deriveEnglish(doc.slug);
    let local = `dr.${en.firstName.toLowerCase()}.${en.lastName.toLowerCase()}`;
    let email = `${local}@imc.med.sa`;
    let suffix = 2;
    while (usedEmails.has(email)) {
      local = `dr.${en.firstName.toLowerCase()}.${en.lastName.toLowerCase()}-${suffix}`;
      email = `${local}@imc.med.sa`;
      suffix++;
    }
    usedEmails.add(email);
    bySlug.set(doc.slug, {
      ...doc,
      nameEn: en.fullName,
      firstName: en.firstName,
      lastName: en.lastName,
      username: local,
      email,
    });
  }

  const doctors = Array.from(bySlug.values());
  console.log(`Unique doctors: ${doctors.length}`);

  const outPath = path.join(__dirname, "data", "all-imc-doctors.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(doctors, null, 2), "utf8");
  console.log(`Dataset written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
