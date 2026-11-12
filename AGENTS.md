<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project brief (read this first)

**Full history, open work, and how we work: [docs/HANDOFF.md](docs/HANDOFF.md).** This section is the short version.

auhbon.com is Auhbon Amiri's portfolio for his software engineering job search: Next.js 16, TypeScript, Tailwind 4, hosted on Vercel (DNS at Spaceship). Copy comes from src/content/profile.ts and must match his master CV (Google Drive, "Auhbon Amiri – CV, private master").

- **Two layers.** Boring mode (the default) is a clean professional portfolio. Fun mode adds the "Bells & whistles" playground: effects, themes, secrets with milestone celebrations, mini games, Wild & Wondrous modes, toys, and extras. State lives in src/lib/fun.ts; unlock rules in src/lib/unlocks.ts (thresholds on a 100-secret scale, scaled down to the live secret count). Secrets only exist in Fun mode.
- **Workflow ("Major Pushes").** Auhbon sends a large batch of notes (an MP). Work happens on the `next` branch, which Vercel previews at https://auhbon-com-git-next-auhbon-3857.vercel.app. Nothing reaches the public site (`main`) until he approves by merging the `next` → `main` pull request. Before building an MP, audit it: estimated cost per item, and items cheaper for him to do by hand. Small fixes between MPs are fine.
- **His review list** is /dev/review (src/content/review.ts). Rewrite it at the end of every MP: everything that needs his eyes, a decision, or his hands, sorted Now / Soon / Ongoing. Items not listed are done.
- **Every MP ends with** an updated CHANGELOG.md, src/content/dev.ts (roadmap, DEV_AS_OF), and /dev/review, plus GitHub issues updated (overview issue #185) and docs/HANDOFF.md if anything about the project changed.
- **Style.** Plain, friendly English; Oxford comma everywhere; WCAG 2.2 AA (keyboard, reduced motion, contrast via `npm run check:contrast`); synthesized sounds only; original art only.
- **Verify** with `npm run check`, a build (`GITHUB_API_URL=http://localhost:8787 npm run build` with the qa/fixture mock), and the Playwright suites in qa/ (core, fun2, effects, themes, wild, draft, mobile, audit). Note: the "Early bird" secret fires between 5 and 8 a.m., which breaks a few core/fun2 assertions during those hours.
- **Usage.** Auhbon cares about the rate of usage more than speed: no parallel agents, targeted reads, few screenshots, and flag expensive work before doing it.
