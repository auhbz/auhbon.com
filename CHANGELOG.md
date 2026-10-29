# Changelog

Every version is saved as a checkpoint branch named `release/<version>`, so any of them can be viewed, compared, or restored at any time. Versions build on each other in order; each entry only describes what changed since the previous one.

| Version | Label | Checkpoint |
|---|---|---|
| 1.5.2 | Updating text | [`release/1.5.2`](https://github.com/auhbz/auhbon.com/tree/release/1.5.2) |
| 1.5.1 | Bells & whistles prototype | [`release/1.5.1`](https://github.com/auhbz/auhbon.com/tree/release/1.5.1) |
| 1.0.0 | Clean pre-bells & whistles | [`release/1.0.0`](https://github.com/auhbz/auhbon.com/tree/release/1.0.0) |

**Restore a checkpoint:** in GitHub, open the branch from the table, or locally run `git checkout release/<version>`. To put a checkpoint back on the live site, merge or reset `main` to it; Vercel redeploys automatically.

---

## 1.5.2: Updating text

Copy and content only; no new features.

**Added**
- Every project from my portfolio document is on the site: Flabby is now featured, and Board Games and Their Designers, FiFi Robo, Music Bot, Tabletop Simulator scripting and Ponk join the "More projects" list.
- Technology filters are generated from every project's stack (26 technologies), so every project can be found by filter. The first 8 show by default, with a "more" toggle for the rest.
- An "Archived" status for projects that are no longer hosted.

**Changed**
- Project copy rewritten to lead with outcomes and my actual role, using facts from my portfolio document, Devpost and GitHub.
- BeeSafe: badge reads "Grand prize winner"; summary reads "A Flutter app built on Google Cloud Vision for the 2020 CSUN Cloud Jam."; my role matches my Devpost note (most of the Flutter front end, plus the Google Vision training dataset).
- DomDom moved from featured to "More projects", matching its smaller scope.
- Space Panic no longer wears an award-style badge (it was a jam entry, which the copy now says).

**Fixed (links)**
- BeeSafe's dead "Project overview" link (buildforcovid19.io no longer exists) is replaced with Devpost; added BeeSafe's GitHub.
- Flabby's play link uses the original `flabbby` address (the `flabby` spelling is a 404).
- Removed Space Panic's demo video: YouTube reports it unavailable.
- Every remaining link was opened and checked in a real browser.

---

## 1.5.1: Bells & whistles prototype

The first version of the opt-in "bells and whistles" mode. The default site is still clean; everything here is off until a visitor turns it on.

**Added**
- A "bells & whistles" badge in the header (splayed bells, an ampersand, splayed whistles, and a light orbiting the outline) that opens a panel of switches.
- Four effects, each with an on/off switch and three styles:
  - **i-dots:** Emoji (shuffle as you get close), Slingshot (pull back a rock and knock letters and words around; real page text is never modified), Bubbles (float up from the i's; pop them).
  - **Buttons:** Rainbow (spinning outline on hover), Electricity (canvas lightning and sparks), Mercury (liquid-metal ring that wakes up near the cursor; buttons lean toward it).
  - **Cursor trail:** Sparkle, Fire (scorch marks on words), Cursed (a ghost follows you).
  - **Sound effects:** Bells & whistles, Cereal, Clown (synthesized with Web Audio; no audio files).
- Five looks: Classic, Terminal, Pico-8, Nature (moss, canopy light, rivers, falling leaves), Spooky (fog, vignette, flicker, bats).
- Shuffle: every effect on with random styles; the look stays Classic.
- Five secrets with a found counter; a console greeting for developers.
- One shared settings store and a single canvas particle engine, so effects can't conflict. Touch-friendly; respects reduced motion; every look passes WCAG AA contrast.

**Changed (site-wide)**
- Dark mode is the default (visitors can still pick Light or match their system).
- Links that leave the site open in a new tab, announced to screen readers.
- DomDom now says I contributed to the front end (set up the project, created tickets, shipped a couple of them) instead of leading it.

**Fixed**
- Switches are independent. Previously, with bells and whistles off, turning on any one switch, or picking a look, turned the whole mode back on and restored every other switch's old state. Now each switch only changes itself; the master switch is a summary (on whenever anything is on), turning it on enables everything with first styles, and turning it off clears everything back to the clean site.

---

## 1.0.0: Clean pre-bells & whistles

The original clean portfolio, live at auhbon.com before any playful extras.

- Next.js 16 + TypeScript + Tailwind CSS, statically prerendered on Vercel; content from my resume, LinkedIn, and portfolio document.
- Reactive hero name (variable-font weight follows the cursor), project filtering by technology (shareable `?stack=` links, View Transitions), a `⌘K` / `Ctrl K` command palette, and a light/dark/system theme toggle (followed the system by default).
- Live "On GitHub" section from the GitHub API, cached hourly, with a safe fallback.
- WCAG 2.2 AA (0 axe violations), strict security headers (CSP, HSTS, frame, referrer, permissions), self-hosted fonts, SEO metadata and share image.
- CI on every push: lint, type-check, contrast check, dependency audit, build.
