import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pages = [
  ["index.html", "https://www.aquira.org/", "WebPage"],
  ["about/index.html", "https://www.aquira.org/about/", "AboutPage"],
  ["contact/index.html", "https://www.aquira.org/contact/", "ContactPage"],
];
const officialNetworkLinks = [
  { number: "01", chapter: "作品と出会う", label: "作品・表現", href: "https://www.aquira.art/", ariaLabel: "第01章 作品と出会う — 作品・表現" },
  { number: "02", chapter: "起点をたどる", label: "起点・記録", href: "https://www.aquira1978.com/", ariaLabel: "第02章 起点をたどる — 起点・記録" },
  { number: "03", chapter: "対話へひらく", label: "公共的実践", href: "https://www.aquira.org/", ariaLabel: "第03章 対話へひらく — 公共的実践" },
];
const galleryUrl = "https://www.viewbug.com/member/Aquira#/";
const galleryLink = `<a href="${galleryUrl}" target="_blank" rel="external noopener noreferrer" aria-label="ギャラリーを新しいタブで開く">ギャラリー</a>`;
const journeyScript = '<script src="/journey.js" defer></script>';

function requiredMatch(value, expression, message) {
  const match = value.match(expression);
  if (!match) throw new Error(message);
  return match;
}

function validateJourneyRail(file, html) {
  const rails = html.match(/<nav class="journey-rail"[\s\S]*?<\/nav>/g) ?? [];
  if (rails.length !== 1) throw new Error(`${file}: expected exactly one journey rail, found ${rails.length}`);
  const rail = rails[0];
  if (!rail.startsWith('<nav class="journey-rail" aria-label="AQUIRAをめぐる3章">')) {
    throw new Error(`${file}: journey rail has an incorrect accessible label`);
  }
  if (!rail.includes('<p class="journey-rail__eyebrow">AQUIRA JOURNEY <span>3つの公式サイトをめぐる</span></p>')) {
    throw new Error(`${file}: journey rail eyebrow copy is incorrect`);
  }
  const items = [...rail.matchAll(/<li class="journey-rail__item(?: is-current)?">([\s\S]*?)<\/li>/g)];
  if (items.length !== officialNetworkLinks.length) throw new Error(`${file}: journey rail must contain three chapters`);
  for (const [index, expected] of officialNetworkLinks.entries()) {
    const item = items[index][0];
    const currentAttribute = expected.number === "03" ? ' aria-current="step"' : "";
    const currentText = expected.number === "03" ? '<span class="journey-rail__current">現在地</span>' : "";
    const expectedLink = `<a href="${expected.href}" aria-label="${expected.ariaLabel}"${currentAttribute}>`;
    if (!item.includes(expectedLink)) throw new Error(`${file}: journey step ${expected.number} has incorrect canonical URL, label, or current state`);
    if (!item.includes(`<span class="journey-rail__number" aria-hidden="true">${expected.number}</span>`)) throw new Error(`${file}: journey step ${expected.number} number is incorrect`);
    if (!item.includes(`<span class="journey-rail__chapter">${expected.chapter}</span>`)) throw new Error(`${file}: journey step ${expected.number} chapter copy is incorrect`);
    if (!item.includes(`<span class="journey-rail__destination">${expected.label}</span>`)) throw new Error(`${file}: journey step ${expected.number} destination copy is incorrect`);
    if (!item.includes(currentText) && currentText) throw new Error(`${file}: journey step 03 requires the visible current indicator`);
    if (expected.number !== "03" && item.includes('journey-rail__current')) throw new Error(`${file}: only the current journey step may display the current indicator`);
  }
  const currentSteps = rail.match(/aria-current="step"/g) ?? [];
  if (currentSteps.length !== 1) throw new Error(`${file}: journey rail must have exactly one aria-current step`);
  const headerEnd = html.indexOf("</header>");
  const mainStart = html.indexOf('<main id="main-content">');
  const railStart = html.indexOf('<nav class="journey-rail"');
  if (!(headerEnd < railStart && railStart < mainStart)) throw new Error(`${file}: journey rail must follow the header and precede main content`);
}

for (const [file, canonical, type] of pages) {
  const html = await readFile(path.join(root, file), "utf8");
  if (!html.includes('<html lang="ja">')) throw new Error(`${file}: missing Japanese language metadata`);
  if (!html.includes('<body data-journey-stage="dialogue">')) throw new Error(`${file}: missing dialogue journey stage`);
  if (!html.includes(`<link rel="canonical" href="${canonical}" />`)) throw new Error(`${file}: missing canonical`);
  if (!html.includes(journeyScript)) throw new Error(`${file}: journey.js must be loaded with defer`);
  validateJourneyRail(file, html);
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`${file}: missing JSON-LD`);
  const graph = JSON.parse(match[1])["@graph"];
  if (!graph.some((item) => item["@type"] === type)) throw new Error(`${file}: missing ${type} schema`);
  const footer = html.match(/<nav aria-label="Aquira公式ネットワーク">[\s\S]*?<\/nav>/)?.[0];
  if (!footer) throw new Error(`${file}: official ecosystem footer is missing`);
  const footerLinks = [...footer.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)]
    .map((linkMatch) => ({ href: linkMatch[1], label: linkMatch[2] }));
  for (const { label, href } of officialNetworkLinks) {
    if (!footerLinks.some((link) => link.label === label && link.href === href)) {
      throw new Error(`${file}: footer must map ${label} to ${href}`);
    }
  }
  const galleryLinkCount = html.split(galleryLink).length - 1;
  if (galleryLinkCount !== 2) {
    throw new Error(`${file}: expected gallery link in header and footer, found ${galleryLinkCount}`);
  }
}

for (const file of ["index.html", "about/index.html"]) {
  const html = await readFile(path.join(root, file), "utf8");
  const cards = [...html.matchAll(/<a class="network-card__link" href="([^"]+)"[^>]*>[\s\S]*?<h3>([^<]+)<\/h3>[\s\S]*?<\/a>/g)]
    .map((match) => ({ href: match[1], label: match[2] }));
  if (cards.length !== officialNetworkLinks.length) {
    throw new Error(`${file}: expected ${officialNetworkLinks.length} official ecosystem cards, found ${cards.length}`);
  }
  for (const expected of officialNetworkLinks) {
    if (!cards.some((card) => card.label === expected.label && card.href === expected.href)) {
      throw new Error(`${file}: full card must map ${expected.label} to ${expected.href}`);
    }
  }
}

const homepage = await readFile(path.join(root, "index.html"), "utf8");
const homeChapterCards = [...homepage.matchAll(/<article class="network-card(?: network-card--current)?" data-chapter-card data-journey-step="(0[1-3])"(?: data-journey-current="true")?>/g)];
if (homeChapterCards.length !== 3) throw new Error(`index.html: expected exactly three chapter cards, found ${homeChapterCards.length}`);
for (const [index, expected] of officialNetworkLinks.entries()) {
  const card = homeChapterCards[index][0];
  if (!card.includes(`data-journey-step="${expected.number}"`)) throw new Error(`index.html: chapter card order must be 01 → 02 → 03`);
}
const currentChapterCards = homepage.match(/data-journey-current="true"/g) ?? [];
if (currentChapterCards.length !== 1) throw new Error("index.html: expected exactly one current chapter card");
for (const file of ["about/index.html", "contact/index.html"]) {
  const html = await readFile(path.join(root, file), "utf8");
  if (html.includes("data-chapter-card")) throw new Error(`${file}: non-home informational cards must not become chapter cards`);
}

await access(path.join(root, "journey.js"));
const css = await readFile(path.join(root, "styles.css"), "utf8");
for (const fragment of [".journey-rail", ".journey-rail__list", "@media (max-width: 700px)", "@media (prefers-reduced-motion: reduce)", ".a11y-reduce-motion", "@media (forced-colors: active)"]) {
  if (!css.includes(fragment)) throw new Error(`styles.css: missing required journey rule ${fragment}`);
}

const robots = await readFile(path.join(root, "robots.txt"), "utf8");
const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
for (const [, canonical] of pages) if (!sitemap.includes(`<loc>${canonical}</loc>`)) throw new Error(`sitemap missing ${canonical}`);
if (!robots.includes("Sitemap: https://www.aquira.org/sitemap.xml")) throw new Error("robots sitemap missing");
const production = JSON.parse(await readFile(path.join(root, "ops/production.json"), "utf8"));
if (production.production_origin !== "https://www.aquira.org/") throw new Error("production.json: production origin is incorrect");
if (production.canonical_host !== "www.aquira.org") throw new Error("production.json: canonical host is incorrect");
if (production.deployment_mode !== "manual workflow dispatch") throw new Error("production.json: unexpected deployment mode");
console.log(`Validation passed: ${pages.length} pages, canonical URLs, JSON-LD, exact ecosystem mappings, gallery links, journey rails, chapter cards, script, responsive CSS, sitemap and robots.`);
