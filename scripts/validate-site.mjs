import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  ["index.html", "https://www.aquira.org/", "WebPage"],
  ["about/index.html", "https://www.aquira.org/about/", "AboutPage"],
  ["contact/index.html", "https://www.aquira.org/contact/", "ContactPage"],
];
for (const [file, canonical, type] of pages) {
  const html = await readFile(path.join(root, file), "utf8");
  if (!html.includes('<html lang="ja">')) throw new Error(`${file}: missing Japanese language metadata`);
  if (!html.includes(`<link rel="canonical" href="${canonical}" />`)) throw new Error(`${file}: missing canonical`);
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`${file}: missing JSON-LD`);
  const graph = JSON.parse(match[1])["@graph"];
  if (!graph.some((item) => item["@type"] === type)) throw new Error(`${file}: missing ${type} schema`);
  for (const domain of ["https://www.aquira.art/", "https://www.aquira1978.com/", "https://www.aquira.org/"]) {
    if (!html.includes(domain)) throw new Error(`${file}: missing official network link ${domain}`);
  }
}
const robots = await readFile(path.join(root, "robots.txt"), "utf8");
const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
for (const [, canonical] of pages) if (!sitemap.includes(`<loc>${canonical}</loc>`)) throw new Error(`sitemap missing ${canonical}`);
if (!robots.includes("Sitemap: https://www.aquira.org/sitemap.xml")) throw new Error("robots sitemap missing");
console.log(`Validation passed: ${pages.length} pages, canonical URLs, JSON-LD, network links, sitemap and robots.`);
