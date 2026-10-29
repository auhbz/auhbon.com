# auhbon.com

Personal portfolio of Auhbon Amiri, software engineer in Los Angeles.
Live at **[auhbon.com](https://auhbon.com)**.

The site is small on purpose, but it's built the way I'd build production software: typed end to end, accessible by default, locked down with security headers, and checked in CI on every change.

## Highlights

**Interactive, still static.** A variable-font hero name that reacts to the cursor, one-click project filtering by technology (shareable as `?stack=Java`, animated with the View Transitions API), a `⌘K` command palette, and a light/dark/system theme toggle that applies before first paint. Every interaction is keyboard- and screen-reader-accessible and respects `prefers-reduced-motion`. Verified during development with Playwright interaction tests and axe-core audits in both themes.

**Bells and whistles (opt-in).** A header badge opens a panel of playful extras built on one shared store and a single canvas particle engine: emoji / slingshot / bubble i-dots (the slingshot knocks words around with physics, drawn on canvas so real page text is never touched), rainbow / electric / mercury buttons, sparkle / fire / cursed cursor trails, three synthesized Web Audio sound packs, five looks (Classic, Terminal, Pico-8, Nature, Spooky), shuffle, and a few hidden secrets. Off by default, works with touch, and respects reduced motion.

**Live data, static speed.** The "On GitHub" section reads my latest public repositories from the GitHub REST API. It uses Next.js Cache Components (`"use cache"` + `cacheLife("hours")`), so the page is prerendered as static HTML and refreshes itself in the background about once an hour. If GitHub is unreachable, the section shows a plain fallback link instead of breaking the page.

**Accessibility (WCAG 2.2 AA).**
- Semantic landmarks, one `h1`, logical heading order, skip link to main content
- Every color pair is verified by `scripts/contrast.mjs` in CI (light and dark themes)
- One consistent, high-contrast `:focus-visible` ring; 44px minimum touch targets
- Links are underlined, so meaning never depends on color alone
- Respects `prefers-reduced-motion` and `prefers-color-scheme`
- Audited with axe-core across desktop/mobile and light/dark: 0 violations

**Security.**
- Strict headers on every response: CSP pinned to `'self'`, HSTS (with preload), `X-Frame-Options: DENY`, `nosniff`, a restrictive `Permissions-Policy`, COOP/CORP, and `X-Powered-By` removed
- No third-party scripts, fonts or trackers; fonts are self-hosted
- Data from the GitHub API is filtered (no forks, archived or private repos) and URLs are restricted to `http(s)` before rendering
- The optional `GITHUB_TOKEN` is server-only (`server-only` guard) and needs no permissions
- CI runs with read-only permissions; `npm audit` and Dependabot keep dependencies current

**Performance and SEO.** Static prerendering, self-hosted variable fonts with `font-display: swap`, generated Open Graph image, sitemap, robots.txt, canonical URL and schema.org `Person` structured data.

## Versions

Every version is saved as a `release/<version>` branch you can browse, compare, or restore. Full notes are in [CHANGELOG.md](CHANGELOG.md); what's next is in [ROADMAP.md](ROADMAP.md).

<!-- versions:start -->
| Version | Label | Checkpoint |
|---|---|---|
| 1.5.2 | Updating text | [`release/1.5.2`](https://github.com/auhbz/auhbon.com/tree/release/1.5.2) |
| 1.5.1 | Bells & whistles prototype | [`release/1.5.1`](https://github.com/auhbz/auhbon.com/tree/release/1.5.1) |
| 1.0.0 | Clean pre-bells & whistles | [`release/1.0.0`](https://github.com/auhbz/auhbon.com/tree/release/1.0.0) |
<!-- versions:end -->

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · Vercel

## Project layout

```
src/
  content/profile.ts   all site content: edit this to update the portfolio
  lib/github.ts        cached GitHub API client
  components/          header, footer, GitHub repos section
  app/                 page, layout, metadata routes (OG image, sitemap, robots)
scripts/contrast.mjs   WCAG contrast check for the palette
```

## Run it locally

```bash
npm install
npm run dev          # http://localhost:3000
npm run check        # lint + typecheck + contrast
npm run build
```

Copy `.env.example` to `.env.local` to add an optional `GITHUB_TOKEN`.

## Deploying

Deployed on Vercel from `main`. Every pull request gets a preview URL; CI must pass before merging.
