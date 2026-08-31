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
const jsonForHtml = (value) => JSON.stringify(value, null, 2).replaceAll("<", "\\u003c");
const absoluteUrl = (pathname) => new URL(pathname, `${content.site.origin}/`).href;
const enPath = (jaPath) => jaPath === "/" ? "/en/" : `/en${jaPath}`;
const jaPath = (pathname) => pathname === "/en/" ? "/" : pathname.replace(/^\/en/, "");
const heroAlt = {
  ja: "梁のある室内、カウンター、花、吊り下げ照明、右側に立つ人物を写したモノクロ写真",
  en: "Black-and-white photograph of an interior with beams, a counter, flowers, pendant lights, and a person standing at right.",
};

const english = {
  siteDescription: "Official information on Aquira’s dialogue, collaborations, and projects that engage with society.",
  role: {
    eyebrow: "PROJECTS & DIALOGUE",
    title: "From dialogue, toward practices that engage with society.",
    lead: "aquira.org is the official site for information on Aquira’s dialogue, collaborations, and projects that engage with society. For works and artist information, visit aquira.art; for records of the name and its history, visit aquira1978.com.",
  },
  purpose: [
    ["Opening dialogue", "We create an entry point for dialogue around works and questions—one that does not hurry toward conclusions. Even before the terms or purpose have been put into words, we value room to think."],
    ["Fostering collaboration", "Respecting each other’s backgrounds, time, and roles, we explore possibilities for collaboration where expression and learning meet."],
    ["Documenting practice", "Information on projects is published as a record in which the people involved, dates, locations, and content can be verified. Unconfirmed plans or outcomes are not presented as established accomplishments."],
  ],
  practice: [
    ["Criteria for presenting activities", "Activities introduced here are limited to those for which publicly shareable facts, references, and context have been confirmed. Projects in preparation are presented so as not to misrepresent their progress."],
    ["Approach to enquiries", "For enquiries concerning collaboration, workshops, or dialogue, please share, where possible, the purpose, anticipated format, timing, and participants or intended audience. Once we have considered the details, we will suggest the appropriate point of contact."],
  ],
  contact: {
    title: "Enquiries on dialogue and collaboration",
    lead: "Please tell us what interests you about projects, collaboration, learning spaces, or dialogue that takes works as its point of departure. It is fine if the details or conditions are not yet fully formed.",
  },
};

function languageAlternates(pathname) {
  const japanese = jaPath(pathname);
  return `<link rel="alternate" href="${absoluteUrl(japanese)}" hreflang="ja" />\n  <link rel="alternate" href="${absoluteUrl(enPath(japanese))}" hreflang="en" />\n  <link rel="alternate" href="${absoluteUrl(japanese)}" hreflang="x-default" />`;
}

function header(pathname, language) {
  const isEnglish = language === "en";
  const links = isEnglish
    ? [{ label: "Gallery", href: content.gallery.href, external: true }, { label: "Practice Principles", href: "/en/about/" }]
    : [{ label: content.gallery.label, href: content.gallery.href, external: true }, { label: "活動の基準", href: "/about/" }];
  const languageHref = isEnglish ? jaPath(pathname) : enPath(pathname);
  const languageLabel = isEnglish ? "日本語" : "EN";
  const languageAria = isEnglish ? "Switch to Japanese" : "Switch to English";
  const homeHref = isEnglish ? "/en/" : "/";
  const homeLabel = isEnglish ? "Aquira.org Home" : "Aquira.org ホーム";
  const navLabel = isEnglish ? "Primary navigation" : "主要ナビゲーション";
  const contact = isEnglish ? "Contact" : "お問い合わせ";
  return `<header class="site-header"><a class="wordmark" href="${homeHref}" aria-label="${homeLabel}">${escapeHtml(content.site.shortName)}</a><nav aria-label="${navLabel}">${links.map(({ label, href, external = false }) => `<a href="${href}"${external ? ` target="_blank" rel="external noopener noreferrer" aria-label="${isEnglish ? `Open ${label} in a new tab` : `${label}を新しいタブで開く`}"` : pathname === href ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a>`).join("")}<a class="language-link" href="${languageHref}" aria-label="${languageAria}">${languageLabel}</a><span class="language-link language-link--current" aria-current="page">${isEnglish ? "EN" : "日本語"}</span></nav><a class="header-contact" href="mailto:${content.contact.email}">${contact}</a></header>`;
}

function networkCards(language) {
  const isEnglish = language === "en";
  const steps = isEnglish
    ? [
      { number: "01", role: "OFFICIAL ARTIST HOME", destination: "Works & Expression", text: "Official information on works, artist profiles, collaborations, and licensing.", href: "https://www.aquira.art/en/" },
      { number: "02", role: "ORIGIN & ARCHIVE", destination: "Origin & Archive", text: "Records concerning the origin of the name, its history, the archive, and brand use.", href: "https://www.aquira1978.com/en/" },
      { number: "03", role: "PROJECTS & DIALOGUE", destination: "Public Practice", text: "A record of, and point of access for, dialogue, collaboration, and projects that engage with society.", href: "/en/" },
    ]
    : content.journey.steps;
  return `<div class="network-grid">${steps.map((item) => {
    const isCurrent = item.href === (isEnglish ? "/en/" : content.site.origin + "/");
    const cta = isEnglish ? (isCurrent ? "Visit this site" : "Visit the official site") : `${isCurrent ? "このサイト" : "公式サイト"}を見る`;
    const aria = isEnglish ? `Open the ${item.destination} homepage` : `${item.destination}のホームページを開く`;
    return `<article class="network-card"><a class="network-card__link" href="${item.href}"${isCurrent ? "" : ' rel="external noopener noreferrer"'} aria-label="${aria}"><p class="index">${item.number}</p><p class="role">${item.role}</p><h3>${item.destination}</h3><p>${item.text}</p><span class="network-card__cta">${cta} <span aria-hidden="true">→</span></span></a></article>`;
  }).join("")}</div>`;
}

function footer(language) {
  const isEnglish = language === "en";
  const journey = isEnglish
    ? [["Works & Expression", "https://www.aquira.art/en/"], ["Origin & Archive", "https://www.aquira1978.com/en/"], ["Public Practice", "/en/"]]
    : content.journey.steps.map((item) => [item.destination, item.href]);
  const galleryLabel = isEnglish ? "Gallery" : content.gallery.label;
  const galleryAria = isEnglish ? "Open Gallery in a new tab" : `${content.gallery.label}を新しいタブで開く`;
  const newsAria = isEnglish ? "Open News in a new tab" : "Newsを新しいタブで開く";
  const role = isEnglish ? "Dialogue · Collaboration · Projects" : "対話・協働・プロジェクト";
  const navLabel = isEnglish ? "Aquira Official Network" : "Aquira公式ネットワーク";
  const dateLabel = isEnglish ? "Last updated" : "最終更新";
  return `<footer class="site-footer"><div><p class="footer-title">${content.site.name}</p><p>${role}</p></div><nav aria-label="${navLabel}"><p class="footer-label">AQUIRA OFFICIAL NETWORK</p><ul>${journey.map(([label, href]) => `<li><a href="${href}"${href.startsWith("/") ? "" : ' rel="external noopener noreferrer"'}>${label}</a></li>`).join("")}<li><a href="${content.gallery.href}" target="_blank" rel="external noopener noreferrer" aria-label="${galleryAria}">${galleryLabel}</a></li><li><a href="${content.news.href}" target="_blank" rel="external noopener noreferrer" aria-label="${newsAria}">News</a></li></ul></nav><p class="footer-date">${dateLabel} <time datetime="${content.site.lastModified}">${content.site.lastModified}</time></p></footer>`;
}

function schemas(page) {
  return [
    { "@type": "WebSite", "@id": `${content.site.origin}/#website`, url: `${content.site.origin}/`, name: content.site.name, inLanguage: ["ja-JP", "en"], description: page.language === "en" ? english.siteDescription : content.site.description },
    { "@type": page.type, "@id": `${absoluteUrl(page.pathname)}#webpage`, url: absoluteUrl(page.pathname), name: page.title, description: page.description, inLanguage: page.language === "en" ? "en" : "ja-JP", isPartOf: { "@id": `${content.site.origin}/#website` }, dateModified: content.site.lastModified },
  ];
}

function layout(page) {
  const isEnglish = page.language === "en";
  const canonical = absoluteUrl(page.pathname);
  return `<!doctype html>\n<html lang="${isEnglish ? "en" : "ja"}">\n<head>\n  <meta charset="utf-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1" />\n  <meta name="description" content="${escapeHtml(page.description)}" />\n  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />\n  <meta name="author" content="Aquira.org" />\n  <meta name="theme-color" content="#121311" />\n  <title>${escapeHtml(page.title)}</title>\n  <link rel="canonical" href="${canonical}" />\n  ${page.key === "home" ? `<link rel="preload" as="image" href="${absoluteUrl("/media/aquira-archive-interior.webp")}" type="image/webp" fetchpriority="high" />` : ""}\n  ${languageAlternates(page.pathname)}\n  <link rel="stylesheet" href="/styles.css?v=20260831b" />\n  <meta property="og:locale" content="${isEnglish ? "en_US" : "ja_JP"}" />\n  <meta property="og:type" content="website" />\n  <meta property="og:site_name" content="Aquira.org" />\n  <meta property="og:title" content="${escapeHtml(page.title)}" />\n  <meta property="og:description" content="${escapeHtml(page.description)}" />\n  <meta property="og:url" content="${canonical}" />\n  <meta property="og:image" content="${absoluteUrl("/media/aquira-archive-interior.webp")}" />\n  <meta property="og:image:width" content="2048" />\n  <meta property="og:image:height" content="1392" />\n  <meta property="og:image:alt" content="${heroAlt[page.language]}" />\n  <meta name="twitter:card" content="summary_large_image" />\n  <meta name="twitter:title" content="${escapeHtml(page.title)}" />\n  <meta name="twitter:description" content="${escapeHtml(page.description)}" />\n  <meta name="twitter:image" content="${absoluteUrl("/media/aquira-archive-interior.webp")}" />\n  <meta name="twitter:image:alt" content="${heroAlt[page.language]}" />\n  <script type="application/ld+json">${jsonForHtml({ "@context": "https://schema.org", "@graph": schemas(page) })}</script>\n</head>\n<body data-journey-stage="${content.journey.stage}">\n  <a class="skip-link" href="#main-content">${isEnglish ? "Skip to main content" : "本文へ移動"}</a>\n  ${header(page.pathname, page.language)}\n  <main id="main-content">${page.main}</main>\n  ${footer(page.language)}\n</body>\n</html>`;
}

const japanesePages = [
  { key: "home", language: "ja", pathname: "/", output: "index.html", type: "WebPage", title: "Aquira.org｜プロジェクトと対話", description: content.site.description, main: `<section class="hero hero-visual" aria-labelledby="hero-title"><picture class="hero__media"><source media="(max-width: 700px)" srcset="/media/aquira-archive-interior-mobile.webp" type="image/webp" /><img class="hero__image" src="/media/aquira-archive-interior.webp" width="2048" height="1392" alt="${heroAlt.ja}" fetchpriority="high" decoding="async" /></picture><div class="hero__content"><p class="eyebrow">${content.role.eyebrow}</p><h1 id="hero-title">${content.role.title}</h1><p class="lead">${content.role.lead}</p><a class="button" href="/about/">活動の基準を知る</a></div></section><section class="section" aria-labelledby="purpose-title"><div class="section-heading"><p class="eyebrow">PURPOSE</p><h2 id="purpose-title">対話に、文脈を添える。</h2></div><div class="card-grid">${content.purpose.map((item) => `<article class="content-card"><h3>${item.title}</h3><p>${item.text}</p></article>`).join("")}</div></section><section class="section contact-section" aria-labelledby="home-contact-title"><div class="section-heading"><p class="eyebrow">CONTACT</p><h2 id="home-contact-title">対話の始まりを、静かに。</h2></div><p class="statement">プロジェクト、協働、学びの場、作品を起点とした対話について、ご相談を受け付けています。</p><a class="button" href="/contact/">お問い合わせへ</a></section>` },
  { key: "about", language: "ja", pathname: "/about/", output: "about/index.html", type: "AboutPage", title: "活動の基準｜Aquira.org", description: "aquira.orgにおける活動の掲載基準、相談の進め方、公式ネットワークの役割を案内します。", main: `<section class="hero hero-compact"><p class="eyebrow">PRACTICE PRINCIPLES</p><h1>確かめられる実践を、丁寧に伝える。</h1><p class="lead">aquira.orgは、情報を増やすことではなく、関係者と文脈を尊重した実践の記録を大切にします。</p></section><section class="section"><div class="prose-list">${content.practice.map((item) => `<article><h2>${item.title}</h2><p>${item.text}</p></article>`).join("")}</div></section><section class="section section-muted" aria-labelledby="about-network-title"><div class="section-heading"><p class="eyebrow">OFFICIAL NETWORK</p><h2 id="about-network-title">情報の役割を、混ぜない。</h2></div>${networkCards("ja")}</section>` },
  { key: "contact", language: "ja", pathname: "/contact/", output: "contact/index.html", type: "ContactPage", title: "お問い合わせ｜Aquira.org", description: "aquira.orgにおけるプロジェクト、対話、協働に関するお問い合わせ窓口です。", main: `<section class="hero hero-compact"><p class="eyebrow">CONTACT</p><h1>${content.contact.title}</h1><p class="lead">${content.contact.lead}</p><a class="button" href="mailto:${content.contact.email}">${content.contact.email}</a></section><section class="section section-muted"><div class="prose-list"><article><h2>作品・利用許諾のご相談</h2><p>作品、作家プロフィール、利用許諾に関する情報は、<a href="https://www.aquira.art/" rel="external noopener noreferrer">aquira.art</a>からご確認ください。</p></article><article><h2>名称・記録のご相談</h2><p>名称の由来、来歴、アーカイブ、公式表記に関する情報は、<a href="https://www.aquira1978.com/" rel="external noopener noreferrer">aquira1978.com</a>でご案内します。</p></article></div></section>` },
];

const englishPages = [
  { key: "home", language: "en", pathname: "/en/", output: "en/index.html", type: "WebPage", title: "Aquira.org | Projects & Dialogue", description: english.siteDescription, main: `<section class="hero hero-visual" aria-labelledby="hero-title"><picture class="hero__media"><source media="(max-width: 700px)" srcset="/media/aquira-archive-interior-mobile.webp" type="image/webp" /><img class="hero__image" src="/media/aquira-archive-interior.webp" width="2048" height="1392" alt="${heroAlt.en}" fetchpriority="high" decoding="async" /></picture><div class="hero__content"><p class="eyebrow">${english.role.eyebrow}</p><h1 id="hero-title">${english.role.title}</h1><p class="lead">${english.role.lead}</p><a class="button" href="/en/about/">Explore practice principles</a></div></section><section class="section" aria-labelledby="purpose-title"><div class="section-heading"><p class="eyebrow">PURPOSE</p><h2 id="purpose-title">Giving dialogue its context.</h2></div><div class="card-grid">${english.purpose.map(([title, text]) => `<article class="content-card"><h3>${title}</h3><p>${text}</p></article>`).join("")}</div></section><section class="section contact-section" aria-labelledby="home-contact-title"><div class="section-heading"><p class="eyebrow">CONTACT</p><h2 id="home-contact-title">A quiet beginning for dialogue.</h2></div><p class="statement">Enquiries are welcome concerning projects, collaboration, learning spaces, and dialogue that takes works as its point of departure.</p><a class="button" href="/en/contact/">Contact</a></section>` },
  { key: "about", language: "en", pathname: "/en/about/", output: "en/about/index.html", type: "AboutPage", title: "Practice Principles | Aquira.org", description: "An introduction to the criteria for presenting activities on aquira.org, its approach to enquiries, and the roles within the official network.", main: `<section class="hero hero-compact"><p class="eyebrow">PRACTICE PRINCIPLES</p><h1>Communicating verifiable practice with care.</h1><p class="lead">Rather than increasing the amount of information, aquira.org values records of practice that respect the people involved and their context.</p></section><section class="section"><div class="prose-list">${english.practice.map(([title, text]) => `<article><h2>${title}</h2><p>${text}</p></article>`).join("")}</div></section><section class="section section-muted" aria-labelledby="about-network-title"><div class="section-heading"><p class="eyebrow">OFFICIAL NETWORK</p><h2 id="about-network-title">Keeping information roles distinct.</h2></div>${networkCards("en")}</section>` },
  { key: "contact", language: "en", pathname: "/en/contact/", output: "en/contact/index.html", type: "ContactPage", title: "Contact | Aquira.org", description: "Contact point for enquiries concerning projects, dialogue, and collaboration at aquira.org.", main: `<section class="hero hero-compact"><p class="eyebrow">CONTACT</p><h1>${english.contact.title}</h1><p class="lead">${english.contact.lead}</p><a class="button" href="mailto:${content.contact.email}">${content.contact.email}</a></section><section class="section section-muted"><div class="prose-list"><article><h2>Enquiries about works and licensing</h2><p>For information on works, artist profiles, and licensing, please visit <a href="https://www.aquira.art/en/" rel="external noopener noreferrer">aquira.art</a>.</p></article><article><h2>Enquiries about the name and records</h2><p>For information on the origin of the name, its history, the archive, and official forms of the name, please visit <a href="https://www.aquira1978.com/en/" rel="external noopener noreferrer">aquira1978.com</a>.</p></article></div></section>` },
];

const pages = [...japanesePages, ...englishPages];
await Promise.all(pages.map(async (page) => {
  const output = path.join(root, page.output);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${layout(page).replace(/[ \t]+$/gm, "").trim()}\n`, "utf8");
}));
await writeFile(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((page) => `  <url><loc>${absoluteUrl(page.pathname)}</loc><lastmod>${content.site.lastModified}</lastmod></url>`).join("\n")}\n</urlset>\n`, "utf8");
await writeFile(path.join(root, "robots.txt"), `User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\n\nSitemap: ${content.site.origin}/sitemap.xml\n`, "utf8");
console.log(`Generated ${pages.length} bilingual Aquira.org static pages.`);
