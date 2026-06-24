# Policy Aid — policyaid.co.in

Static website for Policy Aid, an IRDAI-licensed insurance advisory business based in India. Helps users compare health, motor, and travel insurance plans and get expert guidance on claims.

## Live site

- **Primary domain**: [policyaid.co.in](https://policyaid.co.in)
- **Secondary domain**: `policyaid.online` — redirects to the primary domain (via Cloudflare, see Deployment notes)

## Site structure

```
.
├── index.html                  # Homepage
├── products/                   # Plan-type landing pages (health, motor, travel, property)
├── plans/                      # Individual insurer plan reviews + comparison tables (33 pages)
├── blog/                       # SEO articles (29 posts)
├── cities/                     # City x insurance-type pages (45 pages — currently noindexed, see below)
├── claims/, claims-assistance/ # Claims guidance pages
├── health-insurance/, motor-insurance/, travel-insurance/   # Long-form pillar/guide pages
├── health-insurance-portability/, insurance-by-city/, insurance-helplines/  # Supporting pillar pages
├── images/heroes/              # Locally-hosted hero images (no external CDN dependency)
├── images/logos/               # Insurer logos used in plans/*-comparison.html tables. Sourced from Wikimedia Commons where available; insurers without a stable free logo source (ICICI Lombard, SBI General, Aditya Birla, Royal Sundaram, IndusInd) use styled initials badges instead — see the comparison page markup for the mapping
├── resources/                  # Downloadable assets (PDF checklist, etc.)
├── scripts/                    # Utility scripts (e.g. seo-blog-agent.mjs)
├── sitemap.xml                 # Submitted to Google Search Console
├── robots.txt
├── CNAME                       # GitHub Pages custom domain config
└── policyaid-backend.gs        # Google Apps Script backend (gitignored — never committed, contains API keys)
```

### A note on the `cities/` pages

All 45 city pages currently have `<meta name="robots" content="noindex, follow">` and are excluded from `sitemap.xml`. They were templated (same content, city name swapped) and were diluting the site's overall quality signal during its early evaluation period with Google. Pages remain live for direct/internal links — they're just not being indexed. Plan to re-enable individually once each has genuinely unique local content (real hospital networks, regional data, etc.).

The `plans/` review pages are NOT in this category — each is independently researched with differentiated content per insurer (different features, claim settlement ratios, pros/cons) and remain indexed.

## Deployment

- **Host**: GitHub Pages (`vikashaggarwal/policyaid-website`, branch `main`, root path)
- **Trigger**: every push to `main` triggers an automatic GitHub Pages rebuild — no separate deploy step or CI pipeline
- **HTTPS**: GitHub-managed certificate, auto-renewing, covers `policyaid.co.in` + `www.policyaid.co.in`
- **DNS for `policyaid.co.in`**: managed via Hostinger (domain registration only — Hostinger is not used for hosting; zero Hostinger websites/orders are active)
- **DNS for `policyaid.online`**: nameservers point to Cloudflare. A Cloudflare Redirect Rule (301, dynamic expression) forwards all traffic to `https://policyaid.co.in`. Root (`@`) and `www` DNS records are both proxied (orange cloud) so SSL works on both.
- **Lead capture backend**: Google Apps Script (`policyaid-backend.gs`, local-only, never committed) — handles form submissions → Google Sheets + email + WhatsApp notification (via CallMeBot / Meta WhatsApp Cloud API, see comments in that file for setup). See `SETUP-GUIDE.md` for full backend setup steps.

## Working with this repo via Claude

This project has been developed primarily through Claude Code / Claude in an agentic session, using a mix of direct file edits and connected MCP (Model Context Protocol) tools for tasks beyond local file editing:

| MCP tool / connector | Used for |
|---|---|
| **Google Search Console** | Checking indexing status, inspecting URLs, querying search analytics (clicks, impressions, position), submitting sitemaps |
| **Hostinger MCP** | Domain list/lookup, DNS record inspection (confirmed `policyaid.co.in` DNS and that no Hostinger hosting is in use) |
| **Cloudflare MCP** (Workers/D1/R2/KV scope only — no DNS/Zone tools available in the connected version) | Limited; DNS/redirect-rule configuration for `policyaid.online` was done manually via the Cloudflare dashboard |
| **GitHub CLI (`gh`)** | Checking GitHub Pages build status and deployment history |
| **Bash / curl / dig** | DNS propagation checks, HTTP/HTTPS redirect verification, site health checks (robots.txt, sitemap reachability, noindex audits) |

No destructive or credential-entering actions (account creation, payments, deleting the repo, etc.) are performed automatically — those are always confirmed with the site owner first.

## Key conventions

- Design tokens (colors, etc.) are defined as CSS custom properties at the top of each page's `<style>` block — see any page's `:root` selector for the palette (teal/orange/blue theme).
- Standard nav (Products / Claims / Product Guide dropdowns + mobile hamburger menu) should be kept consistent across all non-homepage pages — copy from a recently-updated page like `products/health-insurance.html` rather than the homepage's nav, which has a slightly different structure.
- `policyaid-backend.gs` must never be committed — it's in `.gitignore` because it contains API keys and secrets. Edit it locally and redeploy manually via [script.google.com](https://script.google.com) (Deploy → Manage Deployments → New version).
