// Policy Aid — Automated SEO Blog Agent
// Runs twice a week (Tue & Fri) via GitHub Actions.
// 1. Researches current SEO keyword opportunities for health & motor insurance (India)
// 2. Writes a 1500-2000 word blog post for each category
// 3. Publishes the posts to /blog, links them from index.html and sitemap.xml
// 4. Emails the team a copy of both posts
//
// Required environment variables (set as GitHub Actions secrets):
//   ANTHROPIC_API_KEY   - Anthropic API key
//   GMAIL_USER          - Gmail address used to send the alert (e.g. policyaid@gmail.com)
//   GMAIL_APP_PASSWORD  - Gmail App Password for that account
//   ALERT_EMAIL         - Where to send the alert (defaults to GMAIL_USER)
// Optional:
//   ANTHROPIC_MODEL     - defaults to claude-sonnet-4-5-20250929

import Anthropic from "@anthropic-ai/sdk";
import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const BLOG_DIR = path.join(ROOT, "blog");
const INDEX_FILE = path.join(ROOT, "index.html");
const SITEMAP_FILE = path.join(ROOT, "sitemap.xml");
const SITE_URL = "https://www.policyaid.co.in";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORY_META = {
  health: {
    tag: "Health Insurance",
    accent: "#2896A8",
    accentDark: "#1F7A8C",
    pale: "#E6F7F9",
    icon: "fa-solid fa-hospital-user",
    images: [
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800&auto=format&fit=crop&q=80"
    ],
    whatsapp: "https://wa.me/919930140305?text=Hi%20Policy%20Aid%2C%20I%20have%20a%20question%20about%20health%20insurance",
    ctaLabel: "Talk to a Health Advisor →"
  },
  motor: {
    tag: "Motor Insurance",
    accent: "#E84E1B",
    accentDark: "#C63D11",
    pale: "#FEF0EB",
    icon: "fa-solid fa-car",
    images: [
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&fit=crop&q=80"
    ],
    whatsapp: "https://wa.me/919930140305?text=Hi%20Policy%20Aid%2C%20I%20have%20a%20question%20about%20car%20insurance",
    ctaLabel: "Talk to a Motor Advisor →"
  }
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthYear() {
  return new Date().toLocaleString("en-US", { month: "long", year: "numeric" });
}

async function listExistingSlugs() {
  const files = await fs.readdir(BLOG_DIR);
  return files.filter(f => f.endsWith(".html")).map(f => f.replace(/\.html$/, ""));
}

// --- Step 1: Research keyword opportunities via Claude + web search ---
async function researchTopics(existingSlugs) {
  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{
      role: "user",
      content: `You are the SEO manager for Policy Aid (policyaid.co.in), an Indian insurance advisory site (IRDAI licensed agent, based in Mumbai).

Use web search to find CURRENT (${monthYear()}) high-opportunity, low-competition SEO keywords/topics for an Indian audience in two categories: Health Insurance and Motor Insurance.

We have already published articles on these slugs (do NOT repeat these topics):
${existingSlugs.map(s => "- " + s).join("\n")}

Pick ONE new blog topic for Health Insurance and ONE new blog topic for Motor Insurance — topics that Indian consumers are actively searching for right now (e.g. new IRDAI rules, seasonal trends, new product types, common pain points) and that we haven't covered.

Respond with a concise research brief (plain text, no JSON yet) for each category covering:
- Proposed topic / working title
- Primary target keyword
- 3-5 secondary/related keywords
- Why this is a good opportunity right now (1-2 sentences)
- A short content angle/outline (4-6 bullet points of sections to cover)`
    }]
  });

  const text = resp.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n");
  return text;
}

// --- Step 2: Write the actual articles based on the research brief ---
async function writeArticles(researchBrief) {
  const sample = `Tone & style reference (existing article excerpt):
"Zero depreciation (zero-dep) is one of the most popular add-ons in motor insurance — but is it worth the extra 15–20% premium? Here's a detailed breakdown..."
Plain English, practical, India-specific (₹ amounts, IRDAI references, real city examples), helpful rather than salesy, short paragraphs, scannable with H3 subheadings, bullet lists and at least one example/case-study box.`;

  const schema = `Return ONLY a single JSON object (no markdown fences, no commentary) with this exact shape:
{
  "health": {
    "slug": "kebab-case-slug-india",
    "title": "Article H1 title",
    "metaTitle": "SEO title tag, <=60 chars, ending with | Policy Aid",
    "metaDescription": "SEO meta description, <=155 chars",
    "ogDescription": "Short social share description, <=120 chars",
    "keywords": "comma, separated, target, keywords",
    "excerpt": "1-2 sentence teaser for the blog card, <=160 chars",
    "bodyHtml": "Full article body as HTML using only <p>, <h3>, <ul>, <li>, <strong>, <a>, and at most one <div class=\\"example-box\\">...</div> for a worked example. 1500-2000 words. Include 2-3 internal links to other Policy Aid blog posts using realistic /blog/<slug>.html hrefs with style=\\"color:#2896A8;font-weight:600;\\" (health) or style=\\"color:#E84E1B;font-weight:600;\\" (motor). Do NOT include <h1>, <html>, <head>, <body>, images, or CTA boxes."
  },
  "motor": { ...same shape as health... }
}`;

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    messages: [{
      role: "user",
      content: `You are a senior content writer for Policy Aid, an Indian insurance advisory (policyaid.co.in).

Here is today's SEO research brief from our SEO manager:
---
${researchBrief}
---

${sample}

Write a complete, original, 1500-2000 word blog article for EACH of the two topics (Health Insurance and Motor Insurance) described in the brief above.

${schema}`
    }]
  });

  const text = resp.content.filter(b => b.type === "text").map(b => b.text).join("\n");
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not find JSON in model response:\n" + text);
  return JSON.parse(jsonMatch[0]);
}

function wordCount(html) {
  return html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
}

function buildPostHtml(category, data) {
  const meta = CATEGORY_META[category];
  const wc = wordCount(data.bodyHtml);
  const readTime = Math.max(4, Math.ceil(wc / 200));
  const date = todayISO();
  const image = meta.images[Math.floor(Math.random() * meta.images.length)];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-1M6BFS5WBG"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-1M6BFS5WBG');
</script>
<meta charset="UTF-8">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${data.metaTitle}</title>
<meta name="description" content="${data.metaDescription}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${SITE_URL}/blog/${data.slug}.html">
<meta property="og:title" content="${data.title}">
<meta property="og:description" content="${data.ogDescription}">
<meta property="og:type" content="article">
<meta property="og:url" content="${SITE_URL}/blog/${data.slug}.html">
<meta property="og:image" content="${SITE_URL}/logo.jpeg">
<meta property="og:site_name" content="Policy Aid">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${data.title}">
<meta name="twitter:description" content="${data.ogDescription}">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "${data.title}",
  "description": "${data.metaDescription}",
  "author": {"@type": "Organization", "name": "Policy Aid"},
  "publisher": {"@type": "Organization", "name": "Policy Aid", "logo": {"@type": "ImageObject", "url": "${SITE_URL}/logo.jpeg"}},
  "datePublished": "${date}",
  "dateModified": "${date}",
  "url": "${SITE_URL}/blog/${data.slug}.html",
  "mainEntityOfPage": "${SITE_URL}/blog/${data.slug}.html",
  "keywords": "${data.keywords}"
}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#F7FBFC;color:#12202A}
a{text-decoration:none;color:inherit}
nav{position:sticky;top:0;z-index:100;background:rgba(247,251,252,0.96);backdrop-filter:blur(16px);border-bottom:1px solid #DDE8EC;padding:0 6%;display:flex;align-items:center;justify-content:space-between;height:68px}
.logo-name{font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:900;color:#2896A8}
.logo-tag{font-size:.65rem;color:#E84E1B;font-weight:600;letter-spacing:.5px}
.back-link{font-size:.85rem;color:#2896A8;font-weight:600}
.back-link:hover{text-decoration:underline}
.container{max-width:740px;margin:0 auto;padding:48px 24px 80px}
.tag{display:inline-block;background:${meta.pale};color:${meta.accent};font-size:.72rem;font-weight:800;letter-spacing:.8px;text-transform:uppercase;padding:4px 14px;border-radius:50px;margin-bottom:1.2rem}
h1{font-family:'Playfair Display',serif;font-size:2rem;font-weight:900;line-height:1.2;margin-bottom:.8rem}
.meta{font-size:.8rem;color:#7E9BAD;margin-bottom:2rem}
hr{border:none;border-top:1px solid #DDE8EC;margin-bottom:2rem}
h3{font-family:'Playfair Display',serif;font-size:1.1rem;color:#12202A;margin:1.8rem 0 .8rem}
p{font-size:.95rem;color:#3D5568;line-height:1.8;margin-bottom:1.2rem}
ul{padding-left:1.3rem;color:#3D5568;font-size:.92rem;line-height:2;margin-bottom:1.2rem}
.example-box{background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:0 12px 12px 0;margin:1.5rem 0;font-size:.92rem;color:#3D5568}
.cta-box{margin-top:2.5rem;padding:24px;background:${meta.pale};border-radius:16px;text-align:center}
.cta-box p{color:${meta.accent};font-weight:600;font-size:.95rem;margin-bottom:1rem}
.cta-btn{display:inline-block;background:${meta.accent};color:#fff;font-weight:700;font-size:.9rem;padding:12px 28px;border-radius:50px}
.cta-btn:hover{background:${meta.accentDark}}
footer{text-align:center;padding:32px 24px;border-top:1px solid #DDE8EC;font-size:.8rem;color:#7E9BAD}
img{max-width:100%}
</style>
</head>
<body>
<nav>
  <a href="${SITE_URL}/">
    <div class="logo-name">Policy Aid</div>
    <div class="logo-tag">FIRST AID FOR INSURANCE</div>
  </a>
  <a href="${SITE_URL}/#blog" class="back-link">← Back to Blog</a>
</nav>

<div class="container">
  <div class="tag"><i class="${meta.icon}" style="margin-right:6px"></i>${meta.tag}</div>
  <h1>${data.title}</h1>
  <div class="meta">${monthYear()} · ${readTime} min read · By Policy Aid</div>
  <hr>
<img src="${image}" alt="${data.title}" style="width:100%;border-radius:16px;margin-bottom:2rem;object-fit:cover;max-height:380px;" loading="lazy">

${data.bodyHtml}

  <div class="cta-box">
    <p>Have questions about this? Talk to our advisor — free, no spam.</p>
    <a href="${meta.whatsapp}" class="cta-btn">${meta.ctaLabel}</a>
  </div>
</div>

<footer>© ${new Date().getFullYear()} Policy Aid. IRDAI Licensed Insurance Agent. Mumbai, India.</footer>
<!-- HubSpot Tracking -->
<script type="text/javascript" id="hs-script-loader" async defer src="//js.hs-scripts.com/246367264.js"></script>
</body>
</html>
`;
}

function buildBCard(category, data) {
  const meta = CATEGORY_META[category];
  const wc = wordCount(data.bodyHtml);
  const readTime = Math.max(4, Math.ceil(wc / 200));
  const monthShort = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });
  const thumbClass = category === "health" ? "th-health" : "th-motor";
  return `    <div class="b-card" data-cat="${category}">
      <div class="b-thumb ${thumbClass}"><i class="${meta.icon}" style="color:${meta.accent}"></i></div>
      <div class="b-body">
        <span class="b-tag">${meta.tag}</span>
        <h3 class="b-title">${data.title}</h3>
        <p class="b-excerpt">${data.excerpt}</p>
        <div class="b-meta"><span>${readTime} min read · ${monthShort}</span><a class="b-read" href="/blog/${data.slug}.html">Read →</a></div>
      </div>
    </div>
`;
}

async function updateIndex(articles) {
  let html = await fs.readFile(INDEX_FILE, "utf8");
  for (const category of ["health", "motor"]) {
    const marker = category === "health" ? "<!-- HEALTH -->" : "<!-- MOTOR -->";
    const card = buildBCard(category, articles[category]);
    html = html.replace(marker, marker + "\n" + card);
  }
  await fs.writeFile(INDEX_FILE, html);
}

async function updateSitemap(articles) {
  let xml = await fs.readFile(SITEMAP_FILE, "utf8");
  const date = todayISO();
  let entries = "";
  for (const category of ["health", "motor"]) {
    const slug = articles[category].slug;
    entries += `  <url>
    <loc>${SITE_URL}/blog/${slug}.html</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }
  xml = xml.replace("</urlset>", entries + "</urlset>");
  await fs.writeFile(SITEMAP_FILE, xml);
}

async function sendEmail(articles, researchBrief) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log("Email credentials not set — skipping email alert.");
    return;
  }
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const to = process.env.ALERT_EMAIL || process.env.GMAIL_USER;
  const date = todayISO();

  let bodyHtml = `<h2>New SEO Blog Posts Published — ${date}</h2>`;
  bodyHtml += `<h3>SEO Research Brief</h3><pre style="white-space:pre-wrap;font-family:inherit">${researchBrief}</pre><hr>`;
  for (const category of ["health", "motor"]) {
    const a = articles[category];
    bodyHtml += `<h3>${CATEGORY_META[category].tag}: ${a.title}</h3>`;
    bodyHtml += `<p><strong>Live URL:</strong> <a href="${SITE_URL}/blog/${a.slug}.html">${SITE_URL}/blog/${a.slug}.html</a></p>`;
    bodyHtml += `<p><strong>Target keywords:</strong> ${a.keywords}</p>`;
    bodyHtml += `<div style="border:1px solid #ddd;padding:16px;border-radius:8px;margin-bottom:24px">${a.bodyHtml}</div>`;
  }

  await transporter.sendMail({
    from: `"Policy Aid SEO Agent" <${process.env.GMAIL_USER}>`,
    to,
    subject: `New SEO Blog Posts — ${date} (Health & Motor)`,
    html: bodyHtml
  });
  console.log("Alert email sent to", to);
}

async function main() {
  console.log("Fetching existing blog slugs...");
  const existingSlugs = await listExistingSlugs();

  console.log("Researching SEO keyword opportunities...");
  const researchBrief = await researchTopics(existingSlugs);
  console.log(researchBrief);

  console.log("Writing articles...");
  const articles = await writeArticles(researchBrief);

  for (const category of ["health", "motor"]) {
    const data = articles[category];
    const html = buildPostHtml(category, data);
    const filePath = path.join(BLOG_DIR, `${data.slug}.html`);
    await fs.writeFile(filePath, html);
    console.log(`Wrote ${filePath} (${wordCount(data.bodyHtml)} words)`);
  }

  console.log("Updating index.html...");
  await updateIndex(articles);

  console.log("Updating sitemap.xml...");
  await updateSitemap(articles);

  console.log("Sending email alert...");
  await sendEmail(articles, researchBrief);

  console.log("Done.");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
