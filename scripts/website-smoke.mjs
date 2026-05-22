import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const website = join(root, "website");
const failures = [];

function fail(message) {
  failures.push(message);
}

async function mustRead(relativePath) {
  try {
    return await readFile(join(root, relativePath), "utf8");
  } catch {
    fail(`missing ${relativePath}`);
    return "";
  }
}

function stripTags(value) {
  return value
    .replace(/<br\s*\/?>/giu, " ")
    .replace(/<[^>]+>/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function extractFirst(html, pattern, label) {
  const match = html.match(pattern);
  if (!match) {
    fail(`missing ${label}`);
    return "";
  }
  return match[1] || "";
}

const html = await mustRead("website/index.html");
const robots = await mustRead("website/robots.txt");
const sitemap = await mustRead("website/sitemap.xml");

const title = stripTags(extractFirst(html, /<title>([\s\S]*?)<\/title>/iu, "title"));
if (title !== "Clawpatch — Automated Code Review") {
  fail(`unexpected title: ${title}`);
}

const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/iu)?.[1] || "";
if (!description.includes("Automated code review that lands fixes")) {
  fail("meta description does not contain the product promise");
}

const h1 = stripTags(extractFirst(html, /<h1>([\s\S]*?)<\/h1>/iu, "h1"));
if (h1 !== "Code review with explicit fixes") {
  fail(`unexpected h1 text: ${h1}`);
}

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/giu)].map((match) => match[1]));
const anchorLinks = [...html.matchAll(/href="#([^"]+)"/giu)].map((match) => match[1]);
for (const id of anchorLinks) {
  if (!ids.has(id)) fail(`missing anchor target: #${id}`);
}

if (!robots.includes("Sitemap: https://clawpatch.ai/sitemap.xml")) {
  fail("robots.txt missing sitemap reference");
}

if (!sitemap.includes("<loc>https://clawpatch.ai/</loc>")) {
  fail("sitemap.xml missing canonical homepage loc");
}

const socialCard = await readFile(join(website, "social-card.png"));
if (socialCard.toString("ascii", 1, 4) !== "PNG") {
  fail("social-card.png is not a PNG");
} else {
  const width = socialCard.readUInt32BE(16);
  const height = socialCard.readUInt32BE(20);
  if (width !== 1200 || height !== 630) {
    fail(`social-card.png dimensions are ${width}x${height}, expected 1200x630`);
  }
}

for (const file of ["website/favicon.svg", "website/CNAME", "website/.nojekyll"]) {
  try {
    await stat(join(root, file));
  } catch {
    fail(`missing ${file}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Website smoke checks passed.");
