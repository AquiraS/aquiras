import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  ["index.html", "https://www.aquira.org/", "WebPage"],
  ["about/index.html", "https://www.aquira.org/about/", "AboutPage"],
  ["contact/index.html", "https://www.aquira.org/contact/", "ContactPage"],
];
const galleryUrl = "https://www.viewbug.com/member/Aquira#/";
const galleryLink = `<a href="${galleryUrl}" target="_blank" rel="external noopener noreferrer" aria-label="ギャラリーを新しいタブで開く">ギャラリー</a>`;
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
  const galleryLinkCount = html.split(galleryLink).length - 1;
  if (galleryLinkCount !== 2) {
    throw new Error(`${file}: expected gallery link in header and footer, found ${galleryLinkCount}`);
  }
}
const officialNetworkUrls = ["https://www.aquira.art/", "https://www.aquira1978.com/", "https://www.aquira.org/"];
for (const file of ["index.html", "about/index.html"]) {
  const html = await readFile(path.join(root, file), "utf8");
  for (const url of officialNetworkUrls) {
    if (!html.includes(`<a class="network-card__link" href="${url}"`)) {
      throw new Error(`${file}: ${url} must be a full-card official-network link`);
    }
  }
}

const robots = await readFile(path.join(root, "robots.txt"), "utf8");
const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
for (const [, canonical] of pages) if (!sitemap.includes(`<loc>${canonical}</loc>`)) throw new Error(`sitemap missing ${canonical}`);
if (!robots.includes("Sitemap: https://www.aquira.org/sitemap.xml")) throw new Error("robots sitemap missing");
const production = JSON.parse(await readFile(path.join(root, "ops/production.json"), "utf8"));
if (production.production_origin !== "https://www.aquira.org/") throw new Error("production.json: production origin is incorrect");
if (production.canonical_host !== "www.aquira.org") throw new Error("production.json: canonical host is incorrect");
if (production.deployment_mode !== "manual workflow dispatch") throw new Error("production.json: unexpected deployment mode");
console.log(`Validation passed: ${pages.length} pages, canonical URLs, JSON-LD, network and gallery links, sitemap and robots.`);
