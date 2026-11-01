# Roadmap and change report

What's planned, what's waiting on a decision, and what changed in each round of feedback, sorted by the numbered notes it answers. Exact per-version details are in [CHANGELOG.md](CHANGELOG.md), and every version has its own `release/<version>` branch.

## Roadmap

| Item | Status |
|---|---|
| Clown click sound (#9): eight options in a test page | Waiting on a pick |
| Copy editing across the site, resume, LinkedIn and GitHub | Suggestions listed, waiting on approval |
| Global leaderboards | Built; turns on when storage is connected |
| Version URLs (e.g. `1-0-0.auhbon.com`, one per checkpoint) | Proposed, waiting on approval |
| More effects, options and categories (#11) | WIP |
| 100 secrets (12 hidden so far) | WIP |
| Better mobile experience | WIP (ideas: bottom-sheet panel, one-row header, long-press "hold still", tilt, haptics, shake to shuffle) |
| GitHub activity graph | Planned |
| Outcome numbers in the copy | Planned (needs figures) |
| Recorded sounds (clown laughter) | Skipped for now: laughter doesn't synthesize well, and the site ships no audio files |

## Change report: 1.8.0 → 1.14.0

### Added

| Note | What | Version |
|---|---|---|
| 1 | Project tags get the button effects | 1.9.0 |
| 6 | Click the landed rock to roll it to the goblin; click the goblin to hurry him | 1.9.0 |
| 7 | Every cursor trail reacts to clicks (sparkle ring, fire puff with scorch, ghost lunge) | 1.9.0 |
| 2 | Goblin guide pointing at Bells & whistles until it's first opened, then hide-and-seek in three spots (a new secret) | 1.10.0 |
| 3 | Progress toward 100 secrets with notches at 10/20/40/70 and a party at each milestone (replayable) | 1.10.0 |
| — | The farm story i-dots (chick, worm, farmer; chef or painter ending; a new secret) | 1.12.0 |
| — | Jungle sound pack, fully synthesized | 1.13.0 |
| — | Game modes (Asteroids, Keepy Uppy, Stacker), the "favorite number" numpad unlock, local leaderboards and a storage-ready global one | 1.14.0 |

### Changed

| Note | What | Version |
|---|---|---|
| 23 | Space Panic demo video restored at its new address | 1.8.1 |
| — | The `me` repo no longer appears in the "On GitHub" section | 1.8.1 |
| 4 | Cookie bites are visible scalloped teeth marks, with bigger crumbs | 1.9.0 |
| 6 | Slingshot rock sits closer to its i; the goblin runs about 60% faster | 1.9.0 |
| 8 | Cereal and Clown packs are louder, level with the others | 1.9.0 |
| 5 | Secrets tracker moved out of the panel into a trophy button beside the badge (an experiment; revert just 1.11.0 to undo) | 1.11.0 |

### Removed

Nothing this round.

### Skipped or partly done, and why

- **Clown click sound (#9):** not changed yet, by design. It ships once a test-page option is picked.
- **Global leaderboard storage:** the code is done; it needs a storage connection in Vercel.
- **Version URLs:** each version needs its own domain set up in Vercel, so this waits on approval of the approach.

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

## Testing notes

Automated browser checks cover every effect, theme, secret and switch, plus accessibility (axe: 0 violations) and touch.

Bats appear at random times, so the curious bats and the bat secret sit outside the main suite. They're checked by two separate scripts that wait for a bat. In the last run, a curious bat came to the cursor and scattered on click, and the fifth rock hit a bat and unlocked *Batter up*.
