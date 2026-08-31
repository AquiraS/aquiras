import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentUrl = pathToFileURL(path.join(root, "content", "site-content.js"));
const { default: content } = await import(`${contentUrl.href}?updated=${Date.now()}`);

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
const absoluteUrl = (pathname) => new URL(pathname, `${content.site.origin}/`).href;
const jsonForHtml = (value) => JSON.stringify(value, null, 2).replaceAll("<", "\\u003c");
const journeySteps = content.journey.steps;
const heroMedia = `<picture class="hero__media"><source media="(max-width: 700px)" srcset="/media/aquira-archive-interior-mobile.webp" type="image/webp" /><img class="hero__image" src="/media/aquira-archive-interior.webp" width="2048" height="1392" alt="梁のある室内、カウンター、花、吊り下げ照明、右側に立つ人物を写したモノクロ写真" fetchpriority="high" decoding="async" /></picture>`;

function journeyRail() {
  return `<nav class="journey-rail" aria-label="${escapeHtml(content.journey.ariaLabel)}"><div class="journey-rail__inner"><p class="journey-rail__eyebrow">${escapeHtml(content.journey.eyebrow)} <span>${escapeHtml(content.journey.eyebrowSupplement)}</span></p><ol class="journey-rail__list">${journeySteps.map((step) => {
    const isCurrent = step.number === "03";
    return `<li class="journey-rail__item${isCurrent ? " is-current" : ""}"><a href="${escapeHtml(step.href)}" aria-label="${escapeHtml(step.ariaLabel)}"${isCurrent ? ' aria-current="step"' : ""}><span class="journey-rail__number" aria-hidden="true">${escapeHtml(step.number)}</span><span class="journey-rail__chapter">${escapeHtml(step.chapter)}</span><span class="journey-rail__destination">${escapeHtml(step.destination)}</span>${isCurrent ? `<span class="journey-rail__current">${escapeHtml(content.journey.currentLabel)}</span>` : ""}</a></li>`;
  }).join("")}</ol></div></nav>`;
}

function networkCards({ chapterCards = false } = {}) {
  return `<div class="network-grid">${journeySteps.map((item) => {
    const isCurrentSite = item.href === content.site.origin + "/";
    const linkText = `${isCurrentSite ? "このサイト" : "公式サイト"}を見る`;
    const ariaLabel = `${item.destination}のホームページを開く`;
    const articleAttributes = chapterCards ? ` data-chapter-card data-journey-step="${escapeHtml(item.number)}"${isCurrentSite ? ' data-journey-current="true"' : ""}` : "";
    const chapterLine = chapterCards ? `<p class="network-card__chapter">CHAPTER ${escapeHtml(item.number)} · ${escapeHtml(item.chapter)}${isCurrentSite ? ` <span class="network-card__current">${escapeHtml(content.journey.currentLabel)}</span>` : ""}</p>` : "";
    return `<article class="network-card${isCurrentSite && chapterCards ? " network-card--current" : ""}"${articleAttributes}><a class="network-card__link" href="${escapeHtml(item.href)}"${isCurrentSite ? "" : ' rel="external noopener noreferrer"'} aria-label="${escapeHtml(ariaLabel)}"><p class="index">${escapeHtml(item.number)}</p>${chapterLine}<p class="role">${escapeHtml(item.role)}</p><h3>${escapeHtml(item.destination)}</h3><p>${escapeHtml(item.text)}</p><span class="network-card__cta">${escapeHtml(linkText)} <span aria-hidden="true">→</span></span></a></article>`;
  }).join("")}</div>`;
}

function header(pathname) {
  const links = [
    { label: content.gallery.label, href: content.gallery.href, external: true },
    { label: "活動の基準", href: "/about/" },
  ];
  return `<header class="site-header"><a class="wordmark" href="/" aria-label="Aquira.org ホーム">${escapeHtml(content.site.shortName)}</a><nav aria-label="主要ナビゲーション">${links.map(({ label, href, external = false }) => `<a href="${escapeHtml(href)}"${external ? ` target="_blank" rel="external noopener noreferrer" aria-label="${escapeHtml(`${label}を新しいタブで開く`)}"` : pathname === href ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a>`).join("")}</nav><a class="header-contact" href="mailto:${content.contact.email}">お問い合わせ</a></header>`;
}

function footer() {
  const galleryLink = `<li><a href="${escapeHtml(content.gallery.href)}" target="_blank" rel="external noopener noreferrer" aria-label="${escapeHtml(`${content.gallery.label}を新しいタブで開く`)}">${escapeHtml(content.gallery.label)}</a></li>`;
  const newsLink = `<li><a href="${escapeHtml(content.news.href)}" target="_blank" rel="external noopener noreferrer" aria-label="${escapeHtml(`${content.news.label}を新しいタブで開く`)}">${escapeHtml(content.news.label)}</a></li>`;
  return `<footer class="site-footer"><div><p class="footer-title">${escapeHtml(content.site.name)}</p><p>対話・協働・プロジェクト</p></div><nav aria-label="Aquira公式ネットワーク"><p class="footer-label">AQUIRA OFFICIAL NETWORK</p><ul>${journeySteps.map((item) => `<li><a href="${escapeHtml(item.href)}"${item.href === content.site.origin + "/" ? "" : ' rel="external noopener noreferrer"'}>${escapeHtml(item.destination)}</a></li>`).join("")}${galleryLink}${newsLink}</ul></nav><p class="footer-date">最終更新 <time datetime="${content.site.lastModified}">${content.site.lastModified}</time></p></footer>`;
}

function schemas(pathname, title, description, type = "WebPage") {
  return [
    { "@type": "WebSite", "@id": `${content.site.origin}/#website`, url: `${content.site.origin}/`, name: content.site.name, inLanguage: "ja-JP", description: content.site.description },
    { "@type": type, "@id": `${absoluteUrl(pathname)}#webpage`, url: absoluteUrl(pathname), name: title, description, inLanguage: "ja-JP", isPartOf: { "@id": `${content.site.origin}/#website` }, dateModified: content.site.lastModified },
  ];
}

function layout({ pathname, title, description, main, type }) {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
  <meta name="author" content="Aquira.org" />
  <meta name="theme-color" content="#121311" />
  <title>${escapeHtml(title)}</title>
  <link rel="canonical" href="${absoluteUrl(pathname)}" />
${pathname === "/" ? `  <link rel="preload" as="image" href="${absoluteUrl("/media/aquira-archive-interior.webp")}" type="image/webp" fetchpriority="high" />` : ""}
  <link rel="alternate" href="${absoluteUrl(pathname)}" hreflang="ja" />
  <link rel="alternate" href="${absoluteUrl(pathname)}" hreflang="x-default" />
  <link rel="stylesheet" href="/styles.css?v=20260831a" />
  <meta property="og:locale" content="ja_JP" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Aquira.org" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${absoluteUrl(pathname)}" />
  <meta property="og:image" content="${absoluteUrl("/media/aquira-archive-interior.webp")}" />
  <meta property="og:image:width" content="2048" />
  <meta property="og:image:height" content="1392" />
  <meta property="og:image:alt" content="梁のある室内、カウンター、花、吊り下げ照明、右側に立つ人物を写したモノクロ写真" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${absoluteUrl("/media/aquira-archive-interior.webp")}" />
  <meta name="twitter:image:alt" content="梁のある室内、カウンター、花、吊り下げ照明、右側に立つ人物を写したモノクロ写真" />
  <script type="application/ld+json">${jsonForHtml({ "@context": "https://schema.org", "@graph": schemas(pathname, title, description, type) })}</script>
</head>
<body data-journey-stage="${escapeHtml(content.journey.stage)}">
  <a class="skip-link" href="#main-content">本文へ移動</a>
  ${header(pathname)}
  <main id="main-content">${main}</main>
  ${footer()}
</body>
</html>`;
}

const homeTitle = "Aquira.org｜プロジェクトと対話";
const homeDescription = content.site.description;
const homeMain = `<section class="hero hero-visual" aria-labelledby="hero-title">${heroMedia}<div class="hero__content"><p class="eyebrow">${content.role.eyebrow}</p><h1 id="hero-title">${content.role.title}</h1><p class="lead">${content.role.lead}</p><a class="button" href="/about/">活動の基準を知る</a></div></section><section class="section" aria-labelledby="purpose-title"><div class="section-heading"><p class="eyebrow">PURPOSE</p><h2 id="purpose-title">対話に、文脈を添える。</h2></div><div class="card-grid">${content.purpose.map((item) => `<article class="content-card"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`).join("")}</div></section><section class="section contact-section" aria-labelledby="home-contact-title"><div class="section-heading"><p class="eyebrow">CONTACT</p><h2 id="home-contact-title">対話の始まりを、静かに。</h2></div><p class="statement">プロジェクト、協働、学びの場、作品を起点とした対話について、ご相談を受け付けています。</p><a class="button" href="/contact/">お問い合わせへ</a></section>`;

const aboutTitle = "活動の基準｜Aquira.org";
const aboutDescription = "aquira.orgにおける活動の掲載基準、相談の進め方、公式ネットワークの役割を案内します。";
const aboutMain = `<section class="hero hero-compact"><p class="eyebrow">PRACTICE PRINCIPLES</p><h1>確かめられる実践を、丁寧に伝える。</h1><p class="lead">aquira.orgは、情報を増やすことではなく、関係者と文脈を尊重した実践の記録を大切にします。</p></section><section class="section"><div class="prose-list">${content.practice.map((item) => `<article><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.text)}</p></article>`).join("")}</div></section><section class="section section-muted" aria-labelledby="about-network-title"><div class="section-heading"><p class="eyebrow">OFFICIAL NETWORK</p><h2 id="about-network-title">情報の役割を、混ぜない。</h2></div>${networkCards()}</section>`;

const contactTitle = "お問い合わせ｜Aquira.org";
const contactDescription = "aquira.orgにおけるプロジェクト、対話、協働に関するお問い合わせ窓口です。";
const contactMain = `<section class="hero hero-compact"><p class="eyebrow">CONTACT</p><h1>${content.contact.title}</h1><p class="lead">${content.contact.lead}</p><a class="button" href="mailto:${content.contact.email}">${content.contact.email}</a></section><section class="section section-muted"><div class="prose-list"><article><h2>作品・利用許諾のご相談</h2><p>作品、作家プロフィール、利用許諾に関する情報は、<a href="https://www.aquira.art/" rel="external noopener noreferrer">aquira.art</a>からご確認ください。</p></article><article><h2>名称・記録のご相談</h2><p>名称の由来、来歴、アーカイブ、公式表記に関する情報は、<a href="https://www.aquira1978.com/" rel="external noopener noreferrer">aquira1978.com</a>でご案内します。</p></article></div></section>`;

const pages = [
  { pathname: "/", output: "index.html", title: homeTitle, description: homeDescription, main: homeMain, type: "WebPage" },
  { pathname: "/about/", output: "about/index.html", title: aboutTitle, description: aboutDescription, main: aboutMain, type: "AboutPage" },
  { pathname: "/contact/", output: "contact/index.html", title: contactTitle, description: contactDescription, main: contactMain, type: "ContactPage" },
];

await Promise.all(pages.map(async (page) => {
  const output = path.join(root, page.output);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${layout(page).trim()}\n`, "utf8");
}));
await writeFile(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((page) => `  <url><loc>${absoluteUrl(page.pathname)}</loc><lastmod>${content.site.lastModified}</lastmod></url>`).join("\n")}\n</urlset>\n`, "utf8");
await writeFile(path.join(root, "robots.txt"), `User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\n\nSitemap: ${content.site.origin}/sitemap.xml\n`, "utf8");
console.log(`Generated ${pages.length} Aquira static pages.`);
