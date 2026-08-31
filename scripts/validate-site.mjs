import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://www.aquira.org";
const pages = [
  ["/", "index.html", "ja", "WebPage"],
  ["/about/", "about/index.html", "ja", "AboutPage"],
  ["/contact/", "contact/index.html", "ja", "ContactPage"],
  ["/en/", "en/index.html", "en", "WebPage"],
  ["/en/about/", "en/about/index.html", "en", "AboutPage"],
  ["/en/contact/", "en/contact/index.html", "en", "ContactPage"],
];
const heroAlt = {
  ja: "梁のある室内、カウンター、花、吊り下げ照明、右側に立つ人物を写したモノクロ写真",
  en: "Black-and-white photograph of an interior with beams, a counter, flowers, pendant lights, and a person standing at right.",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function pair(pathname) {
  const japanese = pathname === "/en/" ? "/" : pathname.replace(/^\/en/, "");
  return [japanese, japanese === "/" ? "/en/" : `/en${japanese}`];
}

for (const [pathname, file, language, type] of pages) {
  const html = await readFile(path.join(root, file), "utf8");
  const [japanese, english] = pair(pathname);
  assert(html.includes(`<html lang="${language}">`), `${file}: incorrect HTML language`);
  assert(html.includes(`<link rel="canonical" href="${origin}${pathname}" />`), `${file}: canonical must self-reference`);
  assert(html.includes(`href="${origin}${japanese}" hreflang="ja"`), `${file}: Japanese alternate missing`);
  assert(html.includes(`href="${origin}${english}" hreflang="en"`), `${file}: English alternate missing`);
  assert(html.includes(`href="${origin}${japanese}" hreflang="x-default"`), `${file}: Japanese-first x-default missing`);
  assert((html.match(/<h1\b/g) ?? []).length === 1, `${file}: exactly one H1 is required`);
  const schema = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert(schema, `${file}: JSON-LD missing`);
  const graph = JSON.parse(schema)["@graph"] ?? [];
  assert(graph.some((item) => item["@type"] === type), `${file}: ${type} schema missing`);
  assert(graph.some((item) => item["@type"] === "WebSite"), `${file}: WebSite schema missing`);
  if (language === "en") {
    assert(html.includes(`class="language-link" href="${japanese}"`), `${file}: Japanese switch link missing`);
    for (const leaked of ["主要ナビゲーション", "お問い合わせ", "ギャラリー", "最終更新"]) assert(!html.includes(leaked), `${file}: untranslated UI string ${leaked}`);
  } else {
    assert(html.includes(`class="language-link" href="${english}"`), `${file}: English switch link missing`);
  }
}

const japaneseHome = await readFile(path.join(root, "index.html"), "utf8");
const englishHome = await readFile(path.join(root, "en/index.html"), "utf8");
assert(japaneseHome.includes(`alt="${heroAlt.ja}"`), "Japanese hero alt missing");
assert(englishHome.includes(`alt="${heroAlt.en}"`), "English hero alt missing");
assert(englishHome.includes('<link rel="preload" as="image"') && englishHome.includes('fetchpriority="high"'), "English hero preload missing");
await access(path.join(root, "media/aquira-archive-interior.webp"));
await access(path.join(root, "media/aquira-archive-interior-mobile.webp"));

const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
for (const [pathname] of pages) assert(sitemap.includes(`<loc>${origin}${pathname}</loc>`), `sitemap missing ${pathname}`);
const robots = await readFile(path.join(root, "robots.txt"), "utf8");
assert(robots.includes("Sitemap: https://www.aquira.org/sitemap.xml"), "robots sitemap missing");
const production = JSON.parse(await readFile(path.join(root, "ops/production.json"), "utf8"));
assert(production.production_origin === "https://www.aquira.org/", "production origin is incorrect");
assert(production.canonical_host === "www.aquira.org", "canonical host is incorrect");
assert(production.deployment_mode === "manual workflow dispatch", "deployment mode is incorrect");
console.log(`Validation passed: ${pages.length} bilingual pages, reciprocal alternates, language switching, schema, assets, sitemap, and robots.`);
