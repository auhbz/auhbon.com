# auhbon.com: handoff and project memory

Written at the end of Major Push 5 (Nov 12, 2026) so any assistant (ChatGPT, Codex, or Claude) can pick up the project with nothing missing. This file is the long-form memory; `AGENTS.md` is the short version coding agents read automatically.

**Contents**
1. Project and owner
2. How we work (the MP workflow)
3. Where everything lives
4. MP5 status: done, waiting, and not done
5. Copy Review status
6. ChatGPT Project instructions (paste as-is)
7. Codex: setup and first message
8. Suggested skills
9. Accounts and services

---

## 1. Project and owner

- **Owner:** Auhbon Amiri, a full-stack software engineer in Los Angeles who is job hunting. auhbon.com is his portfolio and doubles as a showcase project. He markets himself as an engineer who uses AI coding tools as everyday engineering tools.
- **Stack:** Next.js 16 (App Router; it has breaking changes, so check `node_modules/next/dist/docs/` before using unfamiliar APIs), TypeScript, Tailwind CSS 4, hosted on Vercel, domain and DNS at Spaceship, global leaderboards in Upstash Redis via Vercel Storage. Repo: `github.com/auhbz/auhbon.com`.
- **Two layers:**
  - **Boring mode** (the default for every visitor): a clean professional portfolio. The hero name keeps its reactive font; nothing else playful shows.
  - **Fun mode:** the "Bells & whistles" playground. Fun features come in six kinds: effects (i-dots, buttons, cursor trails, sounds), themes, mini games, Wild & Wondrous modes, toys, and extras (hideable visual or interactive elements such as the portal device, climber, chicken, clay pots, and leaflings). Secrets (achievements) only exist in Fun mode. Found secrets unlock fun features and trigger milestone celebrations.
- **Key code:** `src/lib/fun.ts` (state, secrets list, milestones), `src/lib/unlocks.ts` (unlock rules; thresholds are written on a 100-secret scale and scaled down to the number of live secrets), `src/components/bells-panel.tsx` (the panel), `src/content/profile.ts` (all portfolio copy), `src/content/review.ts` (the review page), `src/content/dev.ts` (roadmap), `src/content/draft.ts` (draft-only features).
- **Long-term goals** (tracked on /dev/goals): 100 secrets, 40 effect options, 12 themes, 8 mini games, 6 Wild & Wondrous modes, 12 toys. Secrets should range from near-gimmes to skill challenges, and every fun-feature area should be both a source of secrets and something secrets unlock.

## 2. How we work (the MP workflow)

1. Auhbon drafts a **Major Push (MP)** in a Google Doc: numbered notes, grouped in sections (Admin/Workflow, Approvals, Copy, Secrets, Effects & Themes, Modes & Toys, Notes to self). If he doesn't mention something, assume it's fine as is.
2. Before building, the assistant **audits the MP**: rough usage cost per item, items that are cheaper for Auhbon to do by hand (LinkedIn edits, GitHub or Vercel UI clicks, visual checks), and items worth deferring. Auhbon picks what to build now.
3. **All MP work goes to the `next` branch**, which Vercel publishes as the **preview site** (https://preview.auhbon.com). **Nothing reaches the public site until Auhbon approves.**
4. Auhbon reviews the preview against **/dev/review**, which is rewritten at the end of every MP and lists everything that needs his eyes, a decision, or his hands (sorted Now / Soon / Ongoing). Anything not listed is done.
5. **To publish**, Auhbon merges the `next` → `main` pull request on GitHub. Partial approval is fine: anything he isn't ready to publish gets moved to draft (see below) and everything else ships.
6. Exceptions that may go straight to `main`: copy he has already approved word for word, and urgent fixes.
7. **Every MP ends with:** CHANGELOG.md and package.json version, `src/content/dev.ts` (roadmap and DEV_AS_OF), a rewritten /dev/review, GitHub issues updated (overview issue #185), and this file updated if anything about the project changed.

**Three versions of the site (decided Nov 12, 2026):**

| Version | What it is | Where | Who sees it |
|---|---|---|---|
| Public | What's live and approved | auhbon.com (`main`) | Everyone |
| Preview | Public plus everything from the latest MP: the default home for all new work and revisions | `next` branch → preview.auhbon.com | Anyone with the link; unlisted and not indexed by search engines |
| Draft | Experiments and parked work-in-progress, shown on top of the site at /dev/draft with diff indicators | /dev/draft on both public and preview | Anyone with the link |

- **Why preview is a separate copy of the site, not a page inside it:** an MP changes things that already exist (copy, effects, Boring mode itself). Showing those requires running the whole next version of the site, which is what a branch deployment is. A page like auhbon.com/dev/preview can't run a different version of the site without fragile proxying. preview.auhbon.com is just as easy to share.
- **Draft is the parking lot.** New fun features carry a stage flag (draft or ready). Draft-stage features only show on /dev/draft, with its diff indicators (dotted outlines, notes, and a "what's different" list). To hold one thing back when publishing an MP, flip that feature to draft and publish everything else.
- **Planned for MP6 (approved idea):** on the preview site, a small "Preview of MPx" banner with a "What's new" list (drawn from /dev/review) and a "Highlight changes" toggle that outlines new or changed elements, like /dev/draft's indicators. Off on the public site.
- **Public access:** the preview must not require a Vercel login. Turn off Vercel Authentication for preview deployments, or at least for the preview.auhbon.com domain (Vercel → Project → Settings → Deployment Protection), and add a noindex header on the preview host so search engines skip it.

## 3. Where everything lives

| What | Where |
|---|---|
| Public site | https://auhbon.com (the `main` branch) |
| Preview site (MP5 and later) | https://preview.auhbon.com (the `next` branch) |
| Draft (experiments) | /dev/draft on public or preview |
| Review list | /dev/review on the preview site |
| Dev pages | /dev: review, roadmap, versions, secrets (with hints, unlockables, draft secrets, and secret ideas), goals, milestones (scaling slider), draft, visuals |
| Code, history, changelog | github.com/auhbz/auhbon.com; CHANGELOG.md; release/x.y.z checkpoint branches |
| This handoff | docs/HANDOFF.md (on `main` and `next`) |
| CV, resumes, About Me | Google Drive, same folder as the originals; the latest are the "(Nov 2026)" and "(Nov 2026, rev 2)" copies |
| Copy Review (decision table) | Claude Docs artifact "auhbon.com Copy Review"; section 5 below has everything still open |
| Tests | qa/*.mjs Playwright suites: core, fun2, effects, effects2, themes, wild, draft, mobile, audit, interactive, scaling |

## 4. MP5 status

**Done (on the preview site, waiting for approval in PR #187 "MP5 → live"):**
- Fun / Boring toggle, Boring by default; secrets only in Fun; the guide goblin points at the toggle until Fun is tried.
- Cheats (type 137 on the numpad): unlock everything, unlock all secrets, and a switch per unlockable, independent of secrets found.
- Unlock progression: effects and themes open within about 7 secrets, mini games one at a time; locked items show with a padlock and how many secrets they need; "Unlocked: …" toasts.
- Milestones and thresholds scale to the live secret count (74 in MP5) and return to 5, 10, 15, 25, 40, 65, 97, 100 at 100 secrets; /dev/milestones has a slider to check it. The progress bar shows the live cap and the 100 goal.
- "Mode" renamed "Mini games" everywhere; "Mode" now only means Wild & Wondrous.
- Effects: easier hamster breakaway with cursor effects off on the wheel, smooth car donuts, bubbles moved up and centered, a cursor breeze and giant bubbles, spectacular fireworks (milestone 2), a Lantern festival (milestone 3), full-body parade animals.
- About 30 new secrets, including 3 per mini game, B&W-specific ones, a Zelda-style chicken, clay pots with gems ("glimmers"), forest-spirit "leaflings", 100 clicks, shuffling, welcome back, early bird, sleepy, and typing prompts ("Quick question" bubble and "Ask me" in Quick actions). 24 more ideas are on /dev/secrets.
- Pho theme live with topping plates and three secrets; Pico-8 climber is Flabby's character and climbs page elements, with a daze secret; the Flabby mini game unlocks by clicking tiny Flabby by its Source code link (harder now, drifting pipes after 20, global leaderboard).
- Board games (still draft): dice physics, Push your luck, Pig, and Free roll.
- Wild & Wondrous: Monkey Mode live (steals words and headings, vines, variable speeds, bowling ball for the crate, a gorilla rampage), unlocked after the first milestone with a monkey announcement; new Gravity Mode.
- Toy box with paint brush, sticky notes, paper airplane, and smoke bombs; portal device is a hideable extra with a one-time "you can hide this" note; a panel section "Unlocked toys, features, & elements".
- /dev/review (replaces Hands-on tasks), /dev/goals, /dev/milestones, richer /dev/secrets.
- Live on the public site already: all approved copy edits and the updated CV and About me PDFs.
- GitHub: pins, repo descriptions, `me` made private, six old repos archived.

**MP5 closeout:** The production themes suite reproduced React #418 on mobile with the saved Board games draft theme. The dice tray now renders inside the hero's React tree, avoiding direct DOM insertion during hydration. Core and fun2 fix the browser clock, with explicit Night owl and Early bird checks. The GitHub audit closed #154, #166, and #169 and recorded progress on the related open issues.

Codex's additions are listed under “MP5 closeout changes added by Codex” on /dev/review. They include the React-owned portal mount points, unique Quick actions group labels, room for the mobile Gamepad beside the Toy box, and a fix that prevents Gravity and Monkey Mode from splitting the same text twice before restoring it.

**Remaining work:**
1. **Leaderboards.** The API reports storage connected; a real score submission end to end hasn't been tested.
2. **Secrets.** The MP5 preview includes four Monkey Mode secrets and the portal cake in the main secret list. Carrying over discoveries already saved by draft visitors is a separate question.
3. **Small known rough edges:** with Monkey Mode on, vines hang over text on phones; on touch, starting a scroll while holding a smoke bomb also throws one.
4. **Release checkpoint.** When PR #187 is merged, create the `release/2.0.0` branch from main (CHANGELOG already lists it).
5. **Preview polish (MP6):** the preview banner, "What's new" list, and "Highlight changes" toggle; stage flags so any fun feature can be parked in draft.
6. **Open decisions for Auhbon** are on /dev/review ("Small calls the builders left for you", the Copy Discuss items, the slideshows, the "I love" list).

## MP6 release and experiments

PR #187 published 2.1.0. The public build omits Toy box, Gravity, Car, and their dependent unlocks and secrets. The preview build keeps them available. Public Monkey Mode is the approved version and public Board games has the original three games.

Use /dev/environments for the Public, Preview, and Draft matrix and /dev/review for the MP6 checklist. Preview Draft includes Knucklebones, the Monkey Mode frenzy prototype, and celebration replays. Glimmer spending, toy selection, the celebration order, and the remaining career-copy decisions are open.

## 5. Copy Review status

Source: the "auhbon.com Copy Review" doc (Nov 10). Auhbon picked Approve, Skip, Discuss, or wrote a note on each row.

- **Done:** every approved row on the site (S1–S4, S6, S8, S12, S13, C3–C7, C11, C12, C18, C19, G7), the Oxford comma everywhere (site, CV, resumes, About Me), the CV (C3, C11, C16 "remove 3.79", S12), the SE resume (R1, R2, R4, R5, R7, R8), the tutoring resume (T1–T3), About Me (C3), and GitHub (G2–G6, G8 private, G9 archived).
- **Skipped by Auhbon (no action):** C8, C9, C10, C13, C15, C20, S9, S10, S11, R6, R9, L7, G1.
- **Waiting for Auhbon's decision ("Discuss"):**
  - C1 + S5, Off-Top stack: the CV says Java plus Python/Flask (and there's an off-top-python repo). If accurate, the site's Off-Top role becomes "…to a working demo, with a Java and Python/Flask back end."
  - C2, Groomer.io lead bullet: CV "Designed and built the availability calculator, the scheduling logic used throughout the app" vs site and LinkedIn "Owned core functionality…". Recommendation: use the CV line everywhere.
  - R0, rebuild the one-page resume from the CV. Recommendation: not now; the Nov 2026 resume already has every approved fix.
  - R3, en dashes in date ranges on the SE resume. Recommendation: yes.
- **Waiting for Auhbon's hands (LinkedIn; paste-ready text is on /dev/review → "LinkedIn updates"):** C3, C4, C6, C14, C17/L2, C18, L4, L5 (add auhbon.com to Featured, first), L6 (Projects), L8 (Open to Work, recruiters only), and Oxford commas.
- **Small leftovers:** the tutoring resume header still links the old "portfolio content" doc (swap for auhbon.com?); the Cover Letter Bank hasn't had an Oxford comma pass.
- **Files:** in Google Drive next to the originals: "Auhbon Amiri – Software Engineer Resume (Nov 2026)", "Auhbon Amiri – Tutoring Resume (Nov 2026)", "Auhbon Amiri – CV (Nov 2026, rev 2)", "Auhbon Amiri – CV, private master (Nov 2026, rev 2)", "Auhbon Amiri – About Me (Nov 2026, rev 2)". The master CV is the source of truth for all copy.

## 6. ChatGPT Project instructions (paste as-is)

```
You're helping me (Auhbon Amiri, a full-stack software engineer in Los Angeles who is job hunting) build and maintain my portfolio site, auhbon.com. The repo is github.com/auhbz/auhbon.com. Read docs/HANDOFF.md and AGENTS.md in the repo for the full project history, conventions, and open work; treat them as the source of truth.

The site
- Next.js 16 (App Router), TypeScript, Tailwind CSS 4, on Vercel; domain at Spaceship; leaderboards in Upstash Redis.
- Boring mode (default) is a clean professional portfolio. Fun mode is an opt-in playground ("Bells & whistles") with effects, themes, secrets (achievements), milestone celebrations, mini games, Wild & Wondrous modes, toys, and extras. Secrets unlock fun features. Long-term goals: 100 secrets, 40 effect options, 12 themes, 8 mini games, 6 Wild & Wondrous modes, 12 toys.
- All portfolio copy must match my master CV (Google Drive: "Auhbon Amiri – CV, private master"). I approve every discrepancy before LinkedIn, the site, GitHub, or resumes change.

How we work
- I send big batches of notes called Major Pushes (MPs). Before building, audit the MP: estimate the cost/effort of each item, flag expensive items, and flag anything that's quicker or cheaper for me to do myself (LinkedIn edits, UI clicks, visual checks). I decide what gets built now.
- Three versions of the site: public (auhbon.com, the `main` branch), preview (the `next` branch at preview.auhbon.com: public plus everything from the latest MP; shareable without logging in, not indexed), and draft (/dev/draft: experiments and parked work-in-progress with visible diff indicators).
- All MP work goes to the preview. Nothing reaches the public site until I approve by merging the `next` → `main` pull request. To hold one item back, move it to draft and publish the rest.
- /dev/review is my single review list. Rewrite it at the end of every MP: everything that needs my eyes, a decision, or my hands, sorted Now / Soon / Ongoing. If I don't mention something in an MP, assume it's fine.
- Every MP ends with: CHANGELOG and version bump, roadmap (src/content/dev.ts), /dev/review, GitHub issues (overview issue #185), and docs/HANDOFF.md if anything changed.
- Before a batch starts, list every login, permission, or approval you'll need from me so the work can run without stopping.
- Answer new messages I send mid-task without abandoning the earlier work unless I say so.
- End every MP reply with: the current roadmap and WIP status, the secrets list, and anything I need to decide or do (marked "for me to decide" or "for me to do").

Quality and style
- Plain, friendly English. Always use the Oxford comma.
- Accessibility (WCAG 2.2 AA), security headers, and good UI/UX are non-negotiable. Reduced-motion fallbacks for anything animated. Sounds are synthesized, never audio files. Art is original (no copyrighted characters).
- Verify your work: lint, type-check, build, and the Playwright suites in qa/. Tell me exactly what you checked.

How I like answers
- Honest, iterative feedback over surface-level responses. Push back when I'm overplanning, overthinking, stalling, or min-maxing low-stakes decisions.
- Be transparent about sources and methodology.
- Structured output (headers, tables, bullets) over long prose.
- Speed doesn't matter to me unless I say so; the rate of usage and the quality of the work do. Prefer the slower, cheaper way when quality is the same.
```

## 7. Codex: setup and first message

**Setup (ChatGPT app → Codex):**
1. Connect GitHub and choose the `auhbz/auhbon.com` repository.
2. Work on the `next` branch.
3. Codex reads `AGENTS.md` automatically; it points here.

**First message to Codex:**

```
Read AGENTS.md and docs/HANDOFF.md, then src/content/review.ts. We're between Major Push 5 and 6, working on the `next` branch.

1. Fix the React hydration warning (#418) listed under "Not done / known issues" in HANDOFF.md. Reproduce it with qa/effects.mjs against `next dev`, find the cause, fix it, and confirm the suites pass (core, fun2, effects, themes, wild, draft).
2. Make the QA suites independent of the time of day (the Early bird secret, 5 to 8 a.m.).
3. Go through the open GitHub issues and close or update the ones MP5 finished; post a short summary on #185.
4. Update /dev/review and HANDOFF.md to match, commit to `next`, and push.

Before starting, tell me what you expect each step to cost and anything you need from me.
```

## 8. Suggested skills

Reusable instructions worth saving as skills (or custom GPT instructions). Each one replaces a long explanation I'd otherwise repeat.

**Start MP**
```
When I paste a new Major Push (MP) for auhbon.com:
1. Read docs/HANDOFF.md, src/content/review.ts, and the latest CHANGELOG entry.
2. Split the MP into items. For each: what it asks, which files it touches, rough effort (small / medium / large) and relative usage cost, and whether it's cheaper for me to do by hand.
3. Flag anything ambiguous with one specific question, and anything that conflicts with an earlier decision.
4. List every login, permission, or approval you'll need from me.
5. Propose an order (foundations first), and stop. Wait for my "go" before building.
Present it as a table: Item | Plan | Effort | Usage | Who (you / me / later).
```

**Wrap MP**
```
When an MP's building is finished, before replying to me:
1. Run lint, type-check, build, and the qa/ suites; list exactly what passed and what didn't.
2. Bump package.json version; add a CHANGELOG entry (label, what changed in plain English).
3. Update src/content/dev.ts (roadmap item and DEV_AS_OF).
4. Rewrite src/content/review.ts: Now (preview checklist of everything new, decisions, things for me to do), Soon, Ongoing. Every MP note I sent must be either done (not listed), listed, or explicitly deferred.
5. Update GitHub issues (close finished ones, comment on #185) and docs/HANDOFF.md.
6. Push `next`, make sure the `next` → `main` pull request exists, and give me the preview link.
7. Reply with: what's done, what's not and why, what I need to decide or do, the secrets list, and the roadmap.
```

**Copy sync**
```
When I change or approve copy for my career materials:
1. Treat "Auhbon Amiri – CV, private master" in Google Drive as the source of truth.
2. Find every place the same fact appears: src/content/profile.ts (site), the site's CV and About me PDFs, LinkedIn, GitHub repo descriptions, the current resumes, and the About Me doc.
3. Show me a table of differences: Where | Now | Proposed. Don't change anything until I approve each row.
4. Apply approved rows everywhere. Save new versions of documents under new file names next to the originals; never overwrite originals.
5. Always use the Oxford comma. Keep resumes to one page and confirm by rendering them.
6. Report what changed where, and list anything I have to do by hand (for example LinkedIn).
```

## 9. Accounts and services

- **GitHub:** auhbz. The assistant can push to the repo; settings like repo visibility need Auhbon to confirm access with his password or passkey.
- **Vercel:** project "auhbon-com" (team auhbon-3857). Pushes to `main` deploy the public site; pushes to `next` deploy the preview site. Upstash Redis is connected through Vercel Storage.
- **Spaceship:** DNS for auhbon.com (www redirects to the apex).
- **Preview domain setup (completed Nov 12, 2026, retained for reference):**
  1. **Vercel, add the domain.** vercel.com → team "auhbon-3857" → project "auhbon-com" → Settings → Domains → Add Domain. Enter `preview.auhbon.com`. If it asks which environment or branch, choose Preview and Git branch `next`. If it doesn't ask, find the new domain in the list, click Edit, set Git Branch to `next`, and save. Vercel then shows "Invalid Configuration" plus the DNS record it wants (usually Type CNAME, Name `preview`, Value `cname.vercel-dns.com` or a longer `…vercel-dns…` value). Copy the value exactly as shown.
  2. **Spaceship, add the DNS record.** spaceship.com → Domain Manager → auhbon.com → Advanced DNS (DNS records) → Add record: Type `CNAME`, Host `preview`, Value = what Vercel showed, TTL = default. Save. Don't change the existing records for `@` and `www`.
  3. **Wait** 5–30 minutes. Vercel's Domains list should turn to "Valid Configuration" and issue the HTTPS certificate on its own.
  4. **Vercel, remove the login wall.** Project → Settings → Deployment Protection → Vercel Authentication → set it to Disabled (or the option that leaves preview deployments public), then Save. Password Protection is a paid add-on and isn't needed. Note: this makes every preview deployment public, which is fine because the repo is public anyway.
  5. **Test** in a private/incognito window, not logged in to Vercel: preview.auhbon.com should show the MP5 version (Boring/Fun toggle at the top).
  6. The custom preview host gets an `X-Robots-Tag: noindex, nofollow` header from `next.config.ts`.
- **Google Drive:** CV, resumes, About Me, Cover Letter Bank (one folder).
- **LinkedIn:** linkedin.com/in/auhbon. Auhbon edits it himself from paste-ready text.
