# Changelog

Every version is saved as a checkpoint branch named `release/<version>`, so any of them can be viewed, compared, or restored at any time. Versions build on each other in order; each entry only describes what changed since the previous one.

| Version | Label | Checkpoint |
|---|---|---|
| 1.8.0 | Goblin, Flow & Cookies | [`release/1.8.0`](https://github.com/auhbz/auhbon.com/tree/release/1.8.0) |
| 1.7.0 | Curious bats & still cursors | [`release/1.7.0`](https://github.com/auhbz/auhbon.com/tree/release/1.7.0) |
| 1.6.0 | Secrets & achievements | [`release/1.6.0`](https://github.com/auhbz/auhbon.com/tree/release/1.6.0) |
| 1.5.3 | Effect fixes & tweaks | [`release/1.5.3`](https://github.com/auhbz/auhbon.com/tree/release/1.5.3) |
| 1.5.2 | Updating text | [`release/1.5.2`](https://github.com/auhbz/auhbon.com/tree/release/1.5.2) |
| 1.5.1 | Bells & whistles prototype | [`release/1.5.1`](https://github.com/auhbz/auhbon.com/tree/release/1.5.1) |
| 1.0.0 | Clean pre-bells & whistles | [`release/1.0.0`](https://github.com/auhbz/auhbon.com/tree/release/1.0.0) |

**Restore a checkpoint:** in GitHub, open the branch from the table, or locally run `git checkout release/<version>`. To put a checkpoint back on the live site, merge or reset `main` to it; Vercel redeploys automatically.

---

## 1.8.0: Goblin, Flow & Cookies

**Added**
- **The goblin** (Slingshot i-dots) (#13): the rock now sits on one i and a little goblin lives on the other. A launched rock lands on the bottom of the screen (bouncing off the sides instead of flying away), and the goblin scurries out, grabs it and carries it back over its head. Under reduced motion the rock simply regrows, as before.
- **Flow** cursor trail (water): it streams off the cursor in the direction you move, drips when you hold still, and splashes with a ripple when you click.
- **Cookie** buttons: chocolate-chip pills; each click takes a bite (with crumbs), and after three bites you get a fresh cookie. Bites are never shown while a button has keyboard focus, so the focus ring is never clipped. Text contrast 5.9:1 or better.

**Changed**
- Slingshot has one rock instead of two (the second i is the goblin's home).

---

## 1.7.0: Curious bats & still cursors

**Added**
- **Curious bats** (Spooky theme): about half the bats now flutter over and hover near your cursor for a while before flying off; the rest fly past as before. Clicking scatters any bats nearby (#7). Curious bats are also easier targets for the *Batter up* secret.
- **Still states for cursor trails** (mouse only; touch has no resting cursor) (#12):
  - *Sparkle*: hold still and a rainbow ring of sparkles circles the cursor.
  - *Fire*: hold still and the flame catches on the cursor and grows.
  - *Cursed*: hold still and the ghost possesses your cursor. The real cursor is hidden and a twitching one takes its place; any movement gives it back instantly.

---

## 1.6.0: Secrets & achievements

**Added**
- **Secrets progress** at the top of the Bells & whistles panel (shown while it's on): "Secrets found X of 10" with a bar, expanding to a grid of 10 badges. Unfound badges are blurred; tap one to peek at its icon as a hint (#8).
- **Five new secrets** (10 total):
  - 🦇 *Batter up*: Spooky theme + slingshot, then hit a bat with a rock (#16).
  - 🥚 *In plain sight*: a big egg that only appears while it's part of a text selection (e.g. Select All), and can only be clicked while highlighted (#17).
  - ⚗️ *Elementalist*: Electric buttons + Fire trail + Bubbles dots (#10).
  - 🌳 *Back to nature*: Nature theme + Birds sounds + Fruit dots (#10).
  - 🤡 *Creepy clown*: Spooky theme + Cursed trail + Clown sounds (#10).

---

## 1.5.3: Effect fixes & tweaks

Polish for existing effects, plus one new sound pack. No new categories.

**Added**
- **Birds** sound pack: chirps on hover, a whistled two-note call on press, trills on launch.
- A **Hover sounds** switch inside Sound effects. Turning it off silences hover sounds but keeps sounds for presses, pops, launches and hits.

**Changed**
- **Cereal** rebuilt from scratch: finger snaps on press, bubble-wrap pops, and a soft crunch on hover. Every sound is now filtered (no raw noise), and a gentle master low-pass and level keep all packs from getting sharp.
- **Clown**: a bulb-horn honk on press with a round of applause every fifth press; hover plays a random slide whistle, kazoo, boing, or (rarely) a whoopee-cushion toot.
- i-dots **Emoji → Fruit** (fruit only), and less twitchy: the pointer has to be closer, and the fruit changes at most about three times a second.
- Buttons **Electricity → Electric** (name only).
- The panel's **Look** section is now **Theme**. To avoid two things called "theme", the header's light/dark button is now **Color mode**.
- **Slingshot**: rocks float well above the letters (except in Terminal and Pico-8, where they already had room), launches ignore anything within the first 44px, and hits barely slow the rock, so it follows the aimed path and the aim preview is honest.

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
