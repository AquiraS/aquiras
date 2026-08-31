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
  { label: "作品・表現", href: "https://www.aquira.art/" },
  { label: "起点・記録", href: "https://www.aquira1978.com/" },
  { label: "公共的実践", href: "https://www.aquira.org/" },
];
const galleryUrl = "https://www.viewbug.com/member/Aquira#/";
const galleryLink = `<a href="${galleryUrl}" target="_blank" rel="external noopener noreferrer" aria-label="ギャラリーを新しいタブで開く">ギャラリー</a>`;
const newsLink = '<a href="https://note.com/aquira" target="_blank" rel="external noopener noreferrer" aria-label="Newsを新しいタブで開く">News</a>';
const heroImage = "/media/aquira-archive-interior.webp";
const mobileHeroImage = "/media/aquira-archive-interior-mobile.webp";
const heroAlt = "梁のある室内、カウンター、花、吊り下げ照明、右側に立つ人物を写したモノクロ写真";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readFooterLinks(html, file) {
  const footer = html.match(/<nav aria-label="Aquira公式ネットワーク">[\s\S]*?<\/nav>/)?.[0];
  assert(footer, `${file}: official ecosystem footer is missing`);
  return {
    footer,
    links: [...footer.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)]
      .map((match) => ({ href: match[1], label: match[2] })),
  };
}

for (const [file, canonical, type] of pages) {
  const html = await readFile(path.join(root, file), "utf8");
  assert(html.includes('<html lang="ja">'), `${file}: missing Japanese language metadata`);
  assert(html.includes(`<link rel="canonical" href="${canonical}" />`), `${file}: missing canonical`);
  assert(!html.includes('class="journey-rail"'), `${file}: retired journey rail must not be rendered`);
  assert(!html.includes('src="/journey.js"'), `${file}: retired journey script must not be loaded`);

  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert(match, `${file}: missing JSON-LD`);
  const graph = JSON.parse(match[1])["@graph"];
  assert(graph.some((item) => item["@type"] === type), `${file}: missing ${type} schema`);

  const { footer, links } = readFooterLinks(html, file);
  for (const { label, href } of officialNetworkLinks) {
    assert(links.some((link) => link.label === label && link.href === href), `${file}: footer must map ${label} to ${href}`);
  }
  assert(html.split(galleryLink).length - 1 === 2, `${file}: expected gallery link in header and footer`);
  assert(footer.split(newsLink).length - 1 === 1 && html.split(newsLink).length - 1 === 1, `${file}: footer must contain exactly one canonical News link`);
}

const about = await readFile(path.join(root, "about/index.html"), "utf8");
const networkCards = [...about.matchAll(/<a class="network-card__link" href="([^"]+)"[^>]*>[\s\S]*?<h3>([^<]+)<\/h3>[\s\S]*?<\/a>/g)]
  .map((match) => ({ href: match[1], label: match[2] }));
assert(networkCards.length === officialNetworkLinks.length, `about/index.html: expected ${officialNetworkLinks.length} official ecosystem cards, found ${networkCards.length}`);
for (const expected of officialNetworkLinks) {
  assert(networkCards.some((card) => card.label === expected.label && card.href === expected.href), `about/index.html: full card must map ${expected.label} to ${expected.href}`);
}

const home = await readFile(path.join(root, "index.html"), "utf8");
assert(home.includes('class="hero hero-visual"') && home.includes(`src="${heroImage}"`) && home.includes(`srcset="${mobileHeroImage}"`) && home.includes(`alt="${heroAlt}"`), "index.html: main visual picture, responsive source, or accessible alternative text is missing");
assert(home.includes('<link rel="preload" as="image"') && home.includes('fetchpriority="high"'), "index.html: main visual preload is missing");
await access(path.join(root, heroImage));
await access(path.join(root, mobileHeroImage));

const css = await readFile(path.join(root, "styles.css"), "utf8");
for (const fragment of ["@media (max-width: 700px)", "@media (prefers-reduced-motion: reduce)", ".a11y-reduce-motion", "@media (forced-colors: active)"]) {
  assert(css.includes(fragment), `styles.css: missing accessibility or responsive rule ${fragment}`);
}

const robots = await readFile(path.join(root, "robots.txt"), "utf8");
const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
for (const [, canonical] of pages) assert(sitemap.includes(`<loc>${canonical}</loc>`), `sitemap missing ${canonical}`);
assert(robots.includes("Sitemap: https://www.aquira.org/sitemap.xml"), "robots sitemap missing");
const production = JSON.parse(await readFile(path.join(root, "ops/production.json"), "utf8"));
assert(production.production_origin === "https://www.aquira.org/", "production.json: production origin is incorrect");
assert(production.canonical_host === "www.aquira.org", "production.json: canonical host is incorrect");
assert(production.deployment_mode === "manual workflow dispatch", "production.json: unexpected deployment mode");
console.log(`Validation passed: ${pages.length} pages, canonical URLs, JSON-LD, simplified navigation, exact ecosystem mappings, gallery links, responsive hero, sitemap and robots.`);
