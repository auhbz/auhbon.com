# Roadmap and change report

This file covers what changed from 1.0.0 to 1.8.0, sorted by the numbered notes it answers. It also lists what was skipped and why, and what's still to do. Exact per-version details are in [CHANGELOG.md](CHANGELOG.md), and every version has its own `release/<version>` branch.

## Change report: 1.0.0 → 1.8.0

### Added

| Note | What | Version |
|---|---|---|
| 3 | **Birds** sound pack | 1.5.3 |
| 5 | **Hover sounds** switch inside Sound effects | 1.5.3 |
| 7 | **Curious bats**: some approach the cursor and scatter on click; others fly past as before | 1.7.0 |
| 8 | **Secrets progress bar** and badge grid; locked badges are blurred, tap to peek at the icon | 1.6.0 |
| 10 | **Combo secrets**: Elementalist (Electric + Fire + Bubbles), Back to nature (Nature + Birds + Fruit), Creepy clown (Spooky + Cursed + Clown) | 1.6.0 |
| 12 | **Still states**: Sparkle rainbow ring, Fire flame grows, Cursed ghost possesses the cursor | 1.7.0 |
| 13 | **Goblin** on the other i fetches the slingshot rock | 1.8.0 |
| 16 | **Batter up** secret: Spooky + Slingshot, hit a bat | 1.6.0 |
| 17 | **In plain sight** secret: an egg that only exists while highlighted | 1.6.0 |
| 20 | Every portfolio project on the site; filters generated from every project's stack | 1.5.2 |
| extra | **Flow** (water) cursor trail: stream, drip, splash | 1.8.0 |
| extra | **Cookie** buttons that get bitten | 1.8.0 |

### Changed

| Note | What | Version |
|---|---|---|
| 1 | Cereal rebuilt: snaps, bubble-wrap pops, soft crunch, all filtered | 1.5.3 |
| 2 | Clown: horn honk on press; slide whistle, kazoo or boing on hover; applause every 5th press; an occasional toot | 1.5.3 |
| 4 | Electricity → **Electric** | 1.5.3 |
| 9 | Switches are independent; the master switch only summarizes them | 1.5.1 |
| 14 | Emoji → **Fruit**, and it cycles less eagerly | 1.5.3 |
| 15 | Rocks sit well above the letters, and hits barely change their path | 1.5.3 |
| 18 | Look → **Theme** (the header's light/dark button became **Color mode**, so nothing shares the name) | 1.5.3 |
| 19 | DomDom: "contributed to" | 1.5.1 |
| 21 | BeeSafe: "Grand prize winner" badge and your summary line | 1.5.2 |
| 22 | Project copy now leads with outcomes and my role | 1.5.2 |
| 23 | BeeSafe links to Devpost; every link checked in a real browser | 1.5.2 |
| — | Slingshot has one rock; the second i is the goblin's home | 1.8.0 |

### Removed

- **Space Panic demo video.** YouTube says it's unavailable.
- **buildforcovid19.io link.** The site no longer exists; Devpost replaced it.
- **Space Panic award badge.** It was a jam entry, not a winner.
- **DomDom as a featured project.** It moved to "More projects" to match its smaller scope.

### Skipped or partly done, and why

- **Real recorded sounds** (#1 snaps, crunch; #2 laughter). Every sound is synthesized in the browser, so the site ships no audio files and needs no licenses. Snaps, pops, honks and whistles synthesize well. **Laughter doesn't**: synthesized laughter sounds creepy. It needs a licensed recording (for example a CC0 clip from Freesound).
- **Nature sound pack** (monkeys, elephants). Same reason: animal calls need recordings. Birds shipped because birdsong synthesizes convincingly.
- **#11 more options and categories.** Waiting on your list. Flow and Cookie, from your other notes, are in.
- **Still states on touch** (#12). A finger has no resting cursor, so these only happen with a mouse.

## Still to do

- **#11**: your list of new options and categories.
- **Chick, farmer and worm i-dots story**: the feed chain; chef → fried chicken with "are you sure?"; painter → chocolate + rabbit → "easter egg easter egg"; then the loop resets. It's a big piece, so it's planned as its own version.
- **Modes**, unlocked by finding every secret: Standard, Asteroids, Keepy Uppy and Stacker. They come with the "unlock all secrets" numpad prompt.
  - The code lives in the page's JavaScript, so it's a fun gate, not real security.
- **Leaderboards** (global and local). Global boards need a small backend (for example Upstash or Vercel KV) with rate limiting, basic anti-cheat and name moderation. Local boards can use browser storage.
- **GitHub activity graph** (saved for later earlier on).
- **Laughter and Nature sounds**, once there are recordings to use.
- **Outcome numbers**: users, downloads, performance, team size. Concrete figures would make the project copy stronger.

## Waiting on you

- **LinkedIn About** says "I'm building a Next.js storefront." That may overclaim now that DomDom says "contributed to".
- **www redirect**: in Vercel, set `www.auhbon.com` to redirect to `auhbon.com`.
- **GitHub section**: hide the profile `README` repo ("me")?
- **Repo description** has a typo: "TypeScrpt".
- **BeeSafe**: Devpost lists the hackathon as LA Hacks 2020, but you said CSUN Cloud Jam 2020. The site uses your wording; worth confirming.
- **Space Panic video**: re-upload it if you'd like it back.
- **Slideshow links** from the portfolio document weren't added, because they couldn't be verified from the PDF.

## Testing notes

Automated browser checks cover every effect, theme, secret and switch, plus accessibility (axe: 0 violations) and touch.

Bats appear at random times, so the curious bats and the bat secret sit outside the main suite. They're checked by two separate scripts that wait for a bat. In the last run, a curious bat came to the cursor and scattered on click, and the fifth rock hit a bat and unlocked *Batter up*.
