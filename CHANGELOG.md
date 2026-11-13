# Changelog

Every version is saved as a checkpoint branch named `release/<version>`, so any of them can be viewed, compared, or restored at any time. Versions build on each other in order; each entry only describes what changed since the previous one.

| Version | Label | Checkpoint |
|---|---|---|
| 2.0.0 | Fun & Boring (MP5) | `release/2.0.0` (created when MP5 is merged to main) |
| 1.22.0 | Effects, polish & phone fixes | [`release/1.22.0`](https://github.com/auhbz/auhbon.com/tree/release/1.22.0) |
| 1.21.0 | Draft sandbox & visuals | [`release/1.21.0`](https://github.com/auhbz/auhbon.com/tree/release/1.21.0) |
| 1.20.0 | Secrets batch | [`release/1.20.0`](https://github.com/auhbz/auhbon.com/tree/release/1.20.0) |
| 1.19.0 | Mobile experience | [`release/1.19.0`](https://github.com/auhbz/auhbon.com/tree/release/1.19.0) |
| 1.18.1 | Roomier intro | [`release/1.18.1`](https://github.com/auhbz/auhbon.com/tree/release/1.18.1) |
| 1.18.0 | CV & About me downloads | [`release/1.18.0`](https://github.com/auhbz/auhbon.com/tree/release/1.18.0) |
| 1.17.1 | CV sync | [`release/1.17.1`](https://github.com/auhbz/auhbon.com/tree/release/1.17.1) |
| 1.17.0 | Dev pages | [`release/1.17.0`](https://github.com/auhbz/auhbon.com/tree/release/1.17.0) |
| 1.16.0 | Farm adventure & cooking secrets | [`release/1.16.0`](https://github.com/auhbz/auhbon.com/tree/release/1.16.0) |
| 1.15.0 | Feedback fixes, round 3 | [`release/1.15.0`](https://github.com/auhbz/auhbon.com/tree/release/1.15.0) |
| 1.14.0 | Game modes & leaderboards | [`release/1.14.0`](https://github.com/auhbz/auhbon.com/tree/release/1.14.0) |
| 1.13.0 | Jungle sounds | [`release/1.13.0`](https://github.com/auhbz/auhbon.com/tree/release/1.13.0) |
| 1.12.0 | The farm story | [`release/1.12.0`](https://github.com/auhbz/auhbon.com/tree/release/1.12.0) |
| 1.11.0 | Secrets beside the badge | [`release/1.11.0`](https://github.com/auhbz/auhbon.com/tree/release/1.11.0) |
| 1.10.0 | Goblin guide, hide-and-seek & milestones | [`release/1.10.0`](https://github.com/auhbz/auhbon.com/tree/release/1.10.0) |
| 1.9.0 | Feedback fixes | [`release/1.9.0`](https://github.com/auhbz/auhbon.com/tree/release/1.9.0) |
| 1.8.1 | Content fixes | [`release/1.8.1`](https://github.com/auhbz/auhbon.com/tree/release/1.8.1) |
| 1.8.0 | Goblin, Flow & Cookies | [`release/1.8.0`](https://github.com/auhbz/auhbon.com/tree/release/1.8.0) |
| 1.7.0 | Curious bats & still cursors | [`release/1.7.0`](https://github.com/auhbz/auhbon.com/tree/release/1.7.0) |
| 1.6.0 | Secrets & achievements | [`release/1.6.0`](https://github.com/auhbz/auhbon.com/tree/release/1.6.0) |
| 1.5.3 | Effect fixes & tweaks | [`release/1.5.3`](https://github.com/auhbz/auhbon.com/tree/release/1.5.3) |
| 1.5.2 | Updating text | [`release/1.5.2`](https://github.com/auhbz/auhbon.com/tree/release/1.5.2) |
| 1.5.1 | Bells & whistles prototype | [`release/1.5.1`](https://github.com/auhbz/auhbon.com/tree/release/1.5.1) |
| 1.0.0 | Clean pre-bells & whistles | [`release/1.0.0`](https://github.com/auhbz/auhbon.com/tree/release/1.0.0) |

**Restore a checkpoint:** in GitHub, open the branch from the table, or locally run `git checkout release/<version>`. To put a checkpoint back on the live site, merge or reset `main` to it; Vercel redeploys automatically.

---

Major Push 4, part 1. 18 new secrets, bringing the total to 35.

- **New secrets:** Cookie monster, Old MacDonald, Double trouble, Perfectionist, Space cadet, Night owl, Keyboard warrior, Curiosity ("What's this?"), Name drop, Pho real, Meeple people, Pod bay doors, Golden leaf, Possessed, and four new combos (Breakfast of champions, Hacker, Insert coin, Big top).
- **Badge hints:** hover a locked badge for "Reveal badge?", then "One-word hint?".
- **Milestones** at 5, 10, 15, 25, 40, 65, 97 and 100. Crossing several at once plays only the biggest party.
- **Parade animals** jump and spin when clicked.
- **Quick actions:** typed secret words (including "hire") work there, and touch devices get "Type a secret word…".
- **Touch gamepad** for the cheat code, in the footer while Bells & whistles is on.
- **/dev/secrets** grouped by category with difficulty estimates.
- Game modes no longer require the in-game secrets.

---

Major Push 4, part 2. A sandbox for trying ideas before they reach the live site, plus visuals in the dev notes. The live site is unchanged.

- **/dev/draft:** the full live site plus draft-only features, each tagged "draft" in Bells & whistles, with a separate secret counter:
  - **Chaos:** unleash the monkeys, with a banana crate, a gorilla behind glass and a peanut-and-banana hammer.
  - **Themes:** Pho and Board games.
  - **Pico-8:** a little climber, and Flabby with his minigame.
  - **Portals:** a device and three test chambers ("It was a lie").
  - **The "I ❤️" staircase list.**
  - 10 draft-only secrets.
- **/dev/draft/diff:** a checklist of everything that differs between the draft and the live site.
- **/dev/visuals:** the farm story tree, the site architecture, release sizes and an effects catalog.
- New `qa/draft.mjs` test suite.

---

Major Push 4, part 3. New effects, a smoother look and phone fixes.

- **Car trail:** a little car chases the cursor with momentum. It skids on sharp turns, does donuts when you stop, and fires nitro on click.
- **Two new sound packs:** Chiptune and Tabletop (card flicks, chips and dice).
- **Hamster i-dots:** click fast enough and the wheels shake, spark, catch fire, then break off and roll away.
- **Guide goblin** recolored to the site's palette, smaller and tucked against the badge. On phones he says "Tap it!!!!".
- **Cursed click:** the ghost now glides back and wobbles instead of jumping, with a soft ripple.
- **Phones:**
  - Electric now draws under your finger, stays lit while held and rests after.
  - Rapid taps on Cookie tags no longer stutter.
- Style pickers in the panel lay out in balanced rows.

---

## 2.0.0: Fun & Boring (MP5)

On the `next` branch and https://preview.auhbon.com until Auhbon approves it. The custom preview host is configured to send a noindex header.

- **Fun / Boring toggle.** Boring (the default) is a plain professional portfolio; Fun brings back the playground. Switching never touches secrets, unlocks, or scores. Secrets only exist in Fun.
- **Unlocks and cheats.** Effects, themes, mini games, Wild & Wondrous modes, toys, and extras unlock as secrets are found. Thresholds and milestones scale to the number of live secrets (goal: 100). Typing 137 enables cheats with a switch per unlockable.
- **Effects.** Easier hamster breakaway, smooth car donuts, higher bubbles with a breeze and giant bubbles, spectacular fireworks, a Lantern festival, and full-body parade animals.
- **About 30 new secrets**, three per mini game, typing prompts ("Quick question"), and hidden critters (a chicken, clay pots, and leaflings).
- **Themes.** Pho goes live with toppings; the Pico-8 climber is Flabby and climbs the page; Flabby becomes a special-unlock mini game; Board games (draft) gets dice physics and three dice games.
- **Wild & Wondrous.** Monkey Mode goes live (stealing words, vines, a bowling ball, and a rampaging gorilla) and Gravity Mode arrives.
- **Toy box** with a paint brush, sticky notes, a paper airplane, and smoke bombs; the portal device becomes a hideable extra.
- **Draft.** Render the dice tray in the hero without inserting DOM during hydration.
- **Mobile.** Leave room for the footer gamepad beside the floating Toy box.
- **QA.** Pin the browser clock for time-sensitive assertions and check Early bird at 6 a.m.
- **Dev.** /dev/review (replaces Hands-on tasks), /dev/goals, /dev/milestones, and a richer /dev/secrets. "Mode" is now "Mini games" everywhere.

## 1.19.0: Mobile experience

Built and tested on the `mobile-preview` branch, then shipped to production in Major Push 4. Everything here applies to phones and touch only; desktop is unchanged.

**Added**
- **Bottom sheets:** on screens 640px wide or less, the Bells & whistles and Secrets panels slide up from the bottom: full width, rounded top corners, a grab handle, at most 85% of the screen tall, scrolling inside, and clear of the home indicator (safe-area insets). They're still native popovers, so tapping outside, Esc and focus handling work as before. Drag the handle down to close.
- **One-row header on phones:** the domain and the four icon buttons (Quick actions, color mode, trophy with its count, Bells & whistles) share one row; the section links sit on a compact second row that scrolls sideways if it ever needs to. Touch targets stay 44px and the buttons keep their names. The goblin guide still points up at the badge.
- **Long-press as "hold still":** with a cursor trail on, holding a finger still for half a second shows the trail's still state at the finger (the sparkle ring, the growing flame, the ghost possessing it, Flow's drip) until the finger lifts or moves. No text selection or callout menu while it's down. Long-pressing links and buttons works as usual.
- **Motion controls** (a new switch, on phones with motion sensors): bubbles drift the way the phone tilts, and holding the slingshot rock without dragging lets tilt aim and pull it (with the usual bands and aim preview); lift the finger to fire. On iPhone, turning it on asks for motion permission; if that's declined, the switch stays off and says why. Off by default.
- **Shake to shuffle:** with Motion controls on, a shake shuffles everything (at most every 2 seconds), with the same toast as the Shuffle button.
- **Swipe the name:** a fast sideways swipe across the hero name flings the letters it crosses in that direction, with the slingshot's physics. Vertical scrolling is untouched, and the swipe isn't mistaken for the browser's back gesture.
- **Haptics** (a new switch, on by default, shown where the phone can vibrate, i.e. Android): a light tap on button presses and a short pattern when a secret is found, only while Bells & whistles is on.

**Changed**
- **Touch-first games:** the Asteroids controls are bigger (68px), split for two thumbs (turn left/right on the left, thrust and fire on the right), and labeled for screen readers. A tap on the playfield gives a short burst of thrust and a shot. Keepy Uppy gives finger taps a little extra reach, and none of the games zoom on a double tap or scroll.

**Notes**
- Reduced motion is respected: trails, bubbles and the letter fling stay off, as before.
- No new dependencies; the Content-Security-Policy and Permissions-Policy are unchanged (motion sensors are allowed for the site itself by default).

---

## 1.18.1: Roomier intro

**Changed**
- The intro and the contact buttons sit side by side with more room (on screens 1024px and wider). The buttons have their own column, arranged 1-2-2: "Email me" alone on top, GitHub and LinkedIn below it, and the two PDF downloads at the bottom. Every button fills its cell and is a little taller. On narrower screens the same 1-2-2 block sits under the paragraph, instead of the paragraph being squeezed beside it.
- The browser test suites, the GitHub fixture and the release helper now live in the repo (`qa/`, `scripts/addver.py`), so they survive a new workspace or computer.

---

## 1.18.0: CV & About me downloads

**Added**
- The full CV and the About me page are now PDFs on the site, at /auhbon-amiri-cv.pdf and /auhbon-amiri-about-me.pdf.
- Links to both sit next to GitHub and LinkedIn in the hero and in the Contact section, and they're in Quick actions too. They open in a new tab.
- The website copy of the CV leaves out the phone number.

---

## 1.17.1: CV sync

**Changed**
- Experience now matches the master CV: the CSUN tutor and grader roles are separate entries with their own dates (tutor Feb to May 2019, grader Jan to May 2020).
- Added the CSUN research assistant role and freelance tutoring.
- Education says "Dean's List every semester" (it was "four times") and lists the National Cyber League Fall 2018 result.
- The Hack the Midlands game is now called Power Panic, matching its repo and the resume.

---

## 1.17.0: Dev pages

**Added**
- **Working-notes pages, reachable only by URL** (not linked from the site, kept out of search engines with noindex, a robots.txt rule and an X-Robots-Tag header):
  - `/dev`: an index of the pages below.
  - `/dev/roadmap`: every roadmap item with its status, plus the mobile ideas.
  - `/dev/secrets`: every secret and its status, with progress toward 100. The answers are spoilers, so each one is hidden until you open "Show how".
  - `/dev/hands-on-tasks`: what's waiting on Auhbon, split into decisions and to-dos, open first.
  - `/dev/versions`: every version's notes, read from CHANGELOG.md at build time, with links to each release branch. This replaces hosting a copy of every old version.
- The data behind the roadmap and hands-on pages lives in one file (`src/content/dev.ts`); secrets come straight from the site's own list, so new ones appear automatically.

**Fixed**
- The header's section links (Work, GitHub, Experience, Contact) now go to the home page's sections from any page, including /dev and the 404 page.

---

## 1.16.0: Farm adventure & cooking secrets

**Changed**
- **The farm story is now a choose-your-own-adventure** (#3). Four rounds of two choices, each set by the ones before, lead to 16 endings. Three are special and award a secret; the other 13 are variations of the common ending, "back to the coop". Paths run through the barn, the road, the kitchen and the art studio. "Are you sure?" moments can only be answered with the buttons, and every ending has a "Start over" button.

**Added**
- **Five new secrets** (17 in total):
  - 🥇 *The golden egg* and 🚗 *Why did the chicken…*: new special endings in the farm story (*Easter egg easter egg* is still the third).
  - 🍳 *Over easy*: reveal the hidden egg by selecting it, then hold the Fire trail over it until it cooks.
  - 🌞 *Sunny side up*: cook an egg in the farm story with the Fire trail.
  - 👀 *Eye spy*: with Bells & whistles on, the "oo" in "looking" (Contact) becomes a pair of googly eyes that follow the cursor. Click one.

---

## 1.15.0: Feedback fixes, round 3

**Added**
- **Reactive electricity** (#5): with Electric buttons, nearby buttons throw arcs of lightning toward the cursor, reaching it when it gets close. Hovering a button sends ripples around its outline, spreading out from under the cursor.
- **Reset all secrets** (#6) in the secrets panel. It explains exactly what it clears (secrets, peeked hints, milestone parties, the goblin's hiding place) and asks before doing it.
- **The 137 unlock asks first** (#7): after the right number, it spells out what will happen (how many secrets get marked found, game modes unlock, milestone parties play, how to undo) before anything changes.
- A CI check that fails if the site uses emoji newer than Emoji 11 (2018).

**Changed**
- The **secrets trophy** is always in the header, even on a first visit with Bells & whistles off (#1). It now sits left of the Bells & whistles badge.
- The **guide goblin** stands right of the Bells & whistles badge and points straight at it, with his speech bubble below; on narrower screens he stands under it and points up (#2). The badge pulses while he's pointing.
- **Clown clicks** rotate between your three picks from the Clown Click Lab: pie splat (G), rimshot (D) and honk-honk (B). Hover sounds are unchanged (#8).
- A click with the **Cursed** trail now shoos the ghost back a little instead of pulling it in (#9).

**Fixed**
- **Effects were drawn slightly off-center** (#4). The effects canvas was sized to the window including its scrollbar but displayed without it, which squeezed every drawing a little toward the left. It now matches the visible page exactly, and also follows scrollbar changes.
- **Missing emoji** (#10). Some emoji are too new for older systems (Windows 10 especially), which show an empty box: the worm, troll, blueberries, mirror ball, flamingo, and the gender-neutral farmer, chef and painter. They're replaced with older equivalents (🐛, 👺, 🥥, 🕺, 🦜, 👨‍🌾, 👨‍🍳, 👨‍🎨).

---

## 1.14.0: Game modes & leaderboards

**Added**
- **Game modes**, in a new **Mode** section of the Bells & whistles panel. They unlock once every secret hidden so far has been found:
  - **Asteroids**: the page breaks apart. Headings, buttons, tags and the letters of my name drift around as asteroids (with their text on them). Turn with ← → or A D, thrust with ↑ or W, fire with Space. Big pieces split in two. Two hits and it's over. Touch screens get on-screen controls.
  - **Keepy Uppy**: keep the volleyball in the air by clicking or tapping it (or Space). At 10 it gets faster, at 20 windy, at 30 the ball shrinks, and at 40 there are two balls.
  - **Stacker**: the page blurs and blocks labeled with my projects and skills slide in; drop each onto the stack with a click, tap or Space. Only the overlap stays; land it perfectly to keep the full width.
- **Unlock all secrets** (with the 137 unlock): a switch in the secrets panel asks "What's my favorite number?" on a numpad (buttons or keyboard). The right answer unlocks every secret, and with them the game modes. A wrong one gets a "Nope".
- **Leaderboards**: after each game, enter three initials to save a score. "This browser" keeps the top 10 per game locally. "Everyone" is a global board, built and ready, that turns on once Upstash Redis storage is connected in Vercel; until then it says it isn't connected yet. Server-side guards: three-letter initials only (with a blocklist), per-game score caps, a minimum play time per point, same-origin posting, and a rate limit per visitor.
- While a game is on screen, the page is blurred and inert and its own cursor effects pause. Esc (or Exit) returns to the site at any time.

---

## 1.13.0: Jungle sounds

**Added**
- **Jungle** sound pack, still fully synthesized (no audio files): monkeys "ooh-ooh-aah-aah" when you press a button; hovering plays a toucan whistle, a curious "ooh?", a frog's ribbit or a cricket; switches play bongos; slingshot launches get a parrot squawk, and when a rock hits something, an elephant trumpets. The monkey and elephant voices are shaped with vowel formant filters.

**Changed**
- The style grid in the panel lays out five options as rows of three.

---

## 1.12.0: The farm story

**Added**
- **Farm** i-dots: the dots on the i's tell a tiny branching story. A hungry chick and a worm; feed the chick and it grows into a hen, and the farmer arrives with two friends who could help.
  - **The chef** has a recipe in mind, and asks "Are you sure? She's so young." Say yes and… fried chicken. Say no and the hen is saved.
  - **The painter** paints the hen's egg chocolate brown, and a rabbit hops over to deliver it: the new secret 🐰 *Easter egg easter egg* (12 secrets in total).
  - Either ending loops back to a new chick. Clicking a dot moves the story along (except "Are you sure?", which only the buttons can answer), and a line of narration with real buttons under the name makes it work by keyboard and screen reader too.

---

## 1.11.0: Secrets beside the badge

An experiment (#5). To put the secrets back inside the panel, revert just this version's commit; later versions don't depend on it.

**Changed**
- The secrets progress bar and badges moved out of the Bells & whistles panel into their own small trophy button, right beside the Bells & whistles badge. It shows how many secrets you've found and opens the same progress bar, milestones and badges (already expanded). It only appears once someone has opened Bells & whistles and either has it on or has found a secret, so first-time visitors see a clean header.

---

## 1.10.0: Goblin guide, hide-and-seek & milestones

**Added**
- **The goblin guide** (#2): until a visitor opens Bells & whistles for the first time, a goblin stands under the button, pointing at it, with a speech bubble: "Click it!!!!". The first click sends him running off. Anyone who has used Bells & whistles before never sees him.
- **Hide and seek** (#2): after that, while Bells & whistles is on, the goblin peeks out from one of three hiding places around the page. Click him and he runs off to the next one; find him in all three for a new secret, 🧌 *Hide and seek* (11 secrets in total).
- **100 secrets as the goal, with milestones** (#3): progress now counts toward 100, with notches on the bar at 10, 20, 40 and 70 and a "Next celebration at…" line. Each milestone throws a quick party rather than unlocking a feature, so nothing important is gated: an animal parade along the bottom of the screen (10), confetti cannons (20), fireworks (40), a disco (70), and all of them at once (100). Celebrated milestones can be replayed from the secrets list. Under reduced motion, a milestone is a toast and a sound only.

---

## 1.9.0: Feedback fixes

**Added**
- **Project tags** (like Lua and Pico-8 under each project) get the button effects too (#1).
- **Every cursor trail reacts to clicks**, anywhere on the page, the way Flow splashes (#7): Sparkle pops a rainbow ring, Fire throws a puff of flame and leaves a scorch mark, and the Cursed ghost lunges at the spot in a puff of ectoplasm.
- **Slingshot**: click the landed rock to roll it toward the goblin, and click the goblin to make him hurry (with dust), whether or not he has the rock yet (#6).

**Changed**
- **Cookie buttons** now visibly work (#4): bites are scalloped teeth marks taken from the top, then bottom, then the end (the old bites sat in the rounded corners, where they cut away nothing). Crumbs are bigger, lighter and more plentiful. A pressed filter chip keeps a clear outline while it's a cookie.
- **Slingshot**: the rock sits closer to its i (it was floating awkwardly high), and the goblin runs about 60% faster (#6).
- **Cereal and Clown** sound packs are louder, to match Birds and Bells & whistles (#8).

---

## 1.8.1: Content fixes

**Added**
- Space Panic's demo video is back, at its new address (youtu.be/qkYgH_80INI).

**Changed**
- The "On GitHub" section no longer shows the `me` repo (an early attempt at this site).

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
