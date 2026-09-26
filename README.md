# Copilot Cloud Quest

An eight-world Microsoft AI-themed campaign with four arcade interludes extending the original platform game.
Choose **Marco, Mario, Donkey, or Bumblebee**, recruit the other three, and keep your existing
combat, blaster, checkpoints, and companions as you travel through the worlds.
There are no replacement protagonists or separate Campus/Team Quest/Orbit modes.

The playfield uses the available page width, up to 1600 pixels, without a
viewport-height width cap. A full-screen control is available. The original
character art, attacks, recruitment, and independent companion AI are reused.
All game controls, quizzes, progress, captions, preferences, and the
level map stay inside the game frame, including in full screen. The rendered
playfield remains 16:9; portrait phones get a taller surrounding frame so quiz
answers and controls remain usable without shrinking the scene's width.

Platform levels keep the HUD and quiz ribbon above the canvas, with captions,
movement/combat controls, and the quiz action in separate rows below it. These
stay inside the game frame but do not cover characters, platforms, or rewards.
Narrow screens separate the control groups into their own rows. Quiz terminals
show a compact monitor; their full titles remain in the ribbon, which highlights
the nearby quiz. Large floating terminal signboards are not drawn.

## The Campaign

| Level | World | Playable Theme | Boss |
| --- | --- | --- | --- |
| 1 | Copilot Campus | Microsoft 365 Copilot, Work IQ, and everyday AI features | The Setup Wizard |
| 2 | GitHub Copilot | AI coding assistance, agents, and code review | The Merge Monster |
| 3 | Cowork Central | Copilot Cowork, research, analysis, and workplace tasks | The Scope Creep |
| 4 | AI Foundry | Models, playgrounds, grounding, and evaluation | The Unstable Deployment |
| 5 | Agent City | Copilot Studio, agent tools, and connected actions | The Infinite Planner |
| 6 | Teams Tower | Meeting Copilot, recap, transcription, and collaboration | The Meeting Overlord |
| 7 | Azure Orbit | Speech, language, documents, and security alongside five brick-breaking waves | The Orbital Firewall |
| 8 | The Intelligence Core | Responsible AI, information protection, enterprise controls, and the saucer finale | Doctor Null and the Legacy Monolith |

Each platform world has its own route, four named chapter checkpoints, secret
platforms, app collectibles, original combat encounters, mission terminals,
boss objectives, artwork, dialogue, and musical arrangement. Main routes allow
return visits without spending resources or relying on optional upgrades.

Complete all three quizzes to enter a platform world's boss arena, then attack
during exposed windows. There are no additional boss questions.
Finishing a level unlocks the next one and offers its arcade interlude first, when available.
The **Level map** control opens the campaign map;
unlocked worlds can be replayed. Azure Orbit is level seven, not a simulator.
The final world transitions from the platform encounter into a saucer finale.

### The Setup Wizard

The first world's boss is a large, grounded robot: a rounded glossy white and
metallic-blue body, short armored legs, blue-lit boots, oversized segmented
fists, four glowing red/green/blue/yellow chest panels, a low black-glass face
with cyan eyes and a digital grin, a faceted crystal crown, and thick cable loops.
There are no shoulder cubes. The artwork comes directly from the supplied
[images/Boss1.png](images/Boss1.png), not a procedural likeness. A transparent
13-layer sprite rig moves the upper arms, fists, thighs, boots, head/cables,
eyes, and grin separately. Alternating steps, raised fists, recoil, charge
lean, jumps, panic, and the final retreat follow combat state; it is not a static
picture sliding around. The other bosses now share its detailed, textured
robotic art style, with their own material treatments and AI-themed equipment.

The neutral pose preserves the source's retained robot pixels and proportions.
Animation uses 2D joints and overlapping cutouts, not newly generated 3D views.
The white background is removed without changing the original PNG. The atlas
and joint metadata are included in the repository, load before play is enabled,
and use the same cache version as the game's modules. On macOS with Swift,
`swift scripts/build-boss-rig.swift` rebuilds them and checks neutral-pose pixel
reconstruction. No Swift installation is needed to play, build, or run Node tests;
the hand-authored masks need adjustment if the reference pose changes.

He is about 16% smaller than the initial rig, leaving more room in the arena.
He strolls and poses early, walks more aggressively after 70% health, and
becomes visibly unstable below 35%. Between attack sequences he also jumps
between the left, center, and right arena positions. An advance landing marker
and crouch announce each jump; the destination stays fixed, the jump and landing
cause no damage, and a landing pause precedes the next attack warning.
Every sequence includes repositioning, a warning, committed attacks, and an
exposed recovery window. His 36 health
points, existing blaster access, companion damage limits, and normal jump
physics apply throughout; no new quiz or special ability is required.

| Phase | Patterns And Counters |
| --- | --- |
| Above 70% | Heavy Slam sends outward ground waves; jump them and retaliate. Triple Volley locks its three aim lines before firing. Royal Charge follows a marked boot-height lane; jump or use an elevated platform, then punish the wall stun. |
| 70% through 35% | Volley can link into a separately warned slam after a clear gap. Arena Control leaves a marked safe lane. At most two weak helpers enter while the boss stops attacking. Defensive Overload exposes the four chest panels: jump and shoot from an existing platform to interrupt it; the released wave is also jumpable. |
| Below 35% | Desperation Combo has two quick energy strikes and a delayed heavy slam. Catastrophe Countdown walks to arena center and counts 3-2-1: run into the green safe lane or interrupt the chest. Unstable Power Burst sends three pairs of waves at fixed intervals. Strong attacks leave longer recovery windows. |

Charges do not turn after commitment. Cornered players get repositioning room;
damage cancels queued follow-ups. No special repeats more than twice in a row.
Ground waves remain visible and active during recovery, and the next attack
waits for old projectiles to clear. The ordinary full jump can clear a charge
in either direction; decorative shoulders and crystals do not cause contact
damage. Armor is hittable during recovery; only the marked chest is interruptible
during overload or countdown charging.

Balloons sit above the crown and avoid the player and attack banner. Optional
jokes wait ten seconds and rotate without immediate repeats. Wall impacts,
shield breaks, missed attacks, idle players, low health, and retries trigger
their corresponding reactions; phase and defeat lines take priority. Warnings,
impacts, and countdown ticks have synthesized cues when effects are enabled.
At zero health, threats stop immediately. He staggers, buckles, pulls himself
up for one last defiant pose, then runs out of the arena to fight another day.
His arms and legs animate during the escape. Results appear only after he has
left the screen; pause freezes the entire sequence. Other bosses keep their
existing defeat presentations.

Automated simulation and mocked-canvas checks cover these rules, including
real-engine jump counters, chest access, countdown escape, companion attacks,
caption placement, and victory cleanup. The visual likeness, readability at
phone scale, sound balance, and encounter feel still need human playtesting.

### Boss Collection

All campaign bosses and arcade finales now use high-resolution, transparent
artwork with reflective armor, glass faces, cable detail, and illuminated
components. The variants preserve the surface detail of the supplied robot
and add distinct chest mechanisms, markings, proportions, and animated poses.
These are textured 2D sprites, not new 3D models or live Microsoft services.
The original Setup Wizard image and its own articulated rig remain unchanged.

| Boss | Microsoft / AI Design |
| --- | --- |
| The Merge Monster | Graphite and silver split armor, mint/blue branch circuitry, merge-node reactor, and asymmetric gauntlets |
| The Scope Creep | Pearl/titanium document vault with stacked work trays and Word/Excel-like document indicators |
| The Unstable Deployment | Foundry thermal reactor, amber plasma vents, brushed-steel armor, and instrumented power fists |
| The Infinite Planner | Teal multi-agent network core with connected processing nodes and independently moving arms |
| The Meeting Overlord | Platinum broadcast armor, Teams-colored speaker arrays, and an illuminated audio waveform |
| Doctor Null and the Legacy Monolith | Dark-metal server armor, gold status lights, protected racks, and pale green circuit energy |
| The Orbital Firewall | Azure-blue security armor with a shield-shaped circuit emblem and plated core shutters |
| Rogue Orchestration Core | Graphite processor casing, copper-lit connections, and an exposed central compute module |

Later platform bosses use independent head, arm, fist, and leg joints for idle
motion, attack windups, impacts, exposure, and defeat. Their original health,
attacks, collision rectangles, and progression rules are unchanged. Animated
artwork bounds keep captions away from the robot and player. Warning banners
use a separate upper band. Reduced motion retains essential attack poses while
stopping decorative oscillation.

Azure Orbit and the final saucer sequence use matching textured core panels
clipped to their original brick targets. Both Invaders finales use the processor
design and mark the actual exposed weak point, not the whole armored shell.
No shoulder cubes are added to these designs.

The prebuilt atlases and [images/Boss-collection.js](images/Boss-collection.js)
metadata ship with the game. Startup loads them before enabling play; the
existing build versions the complete image/module set together. To regenerate
the collection on macOS with Swift after rebuilding the source robot rig:

```sh
node --input-type=module -e "import { WIZARD_RIG } from './images/Boss1-rig.js'; console.log(JSON.stringify(WIZARD_RIG));" | swift scripts/build-boss-collection.swift
npm run build
npm test
```

Add `--preview` to the Swift command for an offline artwork contact sheet in
the system temporary directory. Swift is only needed to regenerate artwork,
not to build or play the game. Tests cover asset identity, alpha channels,
pose transforms, caption separation, encounter mapping, and unchanged target
geometry. Static artwork was inspected; browser motion and readability still
need human playtesting.

### Jumping And Climbing

**Jumping and all original jump platforms remain.** Space and W jump everywhere;
Up Arrow jumps when no ladder or rope is in reach. Holding jump still reaches
higher than tapping, and the original coyote
time, buffered jumps, gaps, and optional upper jump areas remain available.

Ladders and ropes add routes rather than replacing jumps. Hold **Up Arrow** to
climb up or **Down Arrow** to descend a nearby ladder or rope. **R/V** also work;
release to hold your position. Space or W leaves the climb with a jump.
Climbing uses the keyboard; there are no separate on-screen climb buttons.
The original touch movement, jump, and combat controls remain. Companions use
the same climbing physics and can include climbs in their route planning.

Added decks reserve character headroom around existing platforms, terminal
clearance, and the full travel of moving lifts. Decorative supports are kept
within a shallow area beneath their own deck. Reward bricks and recruitment boxes are distributed
into reachable spaces away from climb lanes and terminals instead of intersecting
the upper decks. All original jump platforms remain in their original positions.
Ropes have braided strands and anchors; ladders have shaded rails, rung grips,
and fasteners. Canvas resolution follows display size and pixel density.

Marco, Mario, and Donkey animate their knees, foot lifts, and alternating strides
from actual travel distance, with separate climbing poses. Essential limb motion
remains enabled with reduced motion; stationary or paused characters do not keep
walking. Their original artwork, attack poses, and collision dimensions remain.

The original lower route is retained in each world, with different upper paths:

| World | Added Traversal | Complexity |
| --- | --- | --- |
| Campus | Broad garden terraces connected by ladders | Easy |
| GitHub | Narrow branching canopy platforms and ropes | Medium |
| Cowork | Wide archive mezzanines and stacked shelves | Easy |
| Foundry | Steel gantries and moving conveyor surfaces | Hard |
| Agent City | Rooftop jumps and rope connections | Medium |
| Teams | Stacked meeting floors, ladder shafts, and existing lifts | Hard |
| Core | Narrow circuit platforms, ropes, and conveyor segments | Expert |

Theme-specific landmarks include the campus atrium, repository trees and bridges,
shared offices, model assembly machinery, agent transit buildings, meeting tower
elevators, and the Core command ring. Upper platforms use matching structures.

### Arcade Interludes

These original mini-games are inspired by classic arcade genres, not copies of
their art or music. They use the vendored Planck engine for physical contacts and
bubble motion. Interludes do not add or replace any of the 72 questions.

| After World | Interlude | Game |
| --- | --- | --- |
| GitHub | AI Invaders | Three orbital defense waves, tools, upgrades, cloud nodes, and an orchestration-core boss |
| Cowork | Bubble Firewall | Harpoons split bouncing Copilot-symbol bubbles into smaller targets |
| Agent City | AI Invaders: Night Shift | A stronger orbital swarm and core encounter with the same readable counters |
| Teams | Bubble Festival | A larger Copilot-bubble challenge before Azure Orbit |

Move with **A/D**, Left/Right arrows, mouse, or touch dragging. **Space** or
**F** fires; hold-to-fire in AI Invaders can be disabled in Preferences.
Dedicated on-screen buttons are available. Escape pauses every game.
AI Invaders uses a spacecraft while retaining the selected pilot in campaign
state; Bubble Firewall shows the original selected character.

#### Microsoft & AI Space Defense

Defend the Azure orbital network. Pilot your AI-powered interceptor, recover
tool upgrades, and stop rogue bots before they breach the cloud.

The interceptor uses original 1024x1024 transparent artwork in
[images/Interceptor.png](images/Interceptor.png), with metallic panels, a lit
cockpit, four-color accents, banked turns, recoil, blue exhaust, and shield
ripples. Its original 44x44 collider stays axis-aligned; wings and effects do
not enlarge it. Layered stars, two distant planets, data streams, and an orbital
station replace the skyline. Background motion remains slow; reduced motion
removes decorative movement and limits impact effects without hiding warnings.
The original asset can be rebuilt on macOS with
`swift scripts/build-interceptor.swift`; prebuilt artwork ships with the game.

The first wave teaches the formation pattern. Later waves add fast divers,
flanking interceptors, armored shield cycles, and larger command units. Amber
aim lines and path markers precede shots and maneuvers; targets lock before
release. Player lasers are pale cyan, while hostile bolts are coral diamonds.
Damage grants 1.8 seconds of invulnerability. Repair drops restore three health
to each cloud defense node and can bring destroyed nodes back online. Nodes
retain damage between waves; friendly fire passes through them.

Every fourth destroyed bot drops a tool or repair module in a fixed rotation.
Tool pickups activate immediately when ready; otherwise a charge is stored,
up to two per tool. Use the icon controls or default keys **1-4** to activate
stored charges when their cooldown ends. **Q** also activates Defender Pulse.
Primary custom bindings take precedence over aliases.

| Tool | Effect | Duration | Cooldown |
| --- | --- | --- | --- |
| Azure Shield | Prevents damage while active | 6s | 12s |
| GitHub Copilot Wingman | A support drone fires alongside the ship | 10s | 14s |
| Power Automate Chain | Hits link to up to two nearby bots | 7s | 15s |
| Defender Pulse | Clears hostile bolts within 270 pixels; does not erase the boss laser | Instant | 9s |

After each of the three waves, the mission freezes for one upgrade choice:
Rapid Lasers fires 20% faster per level, Shield Capacitor adds three seconds
of protection, and Wingman Reserve adds five seconds of support. Defensive
upgrades extend an active tool or provide a ready charge. Choices stack for
the current round, and completing a wave restores one health point.

Wave four is the Rogue Orchestration Core. It cycles through capped drone
deployment, a warned sweeping laser that leaves the opposite side clear, and
a locked three-shot volley. Its center opens between attacks; side armor does
not take damage. Defeating it clears all remaining threats and ends the round.
The HUD retains score, health, wave, and time, with compact tool readouts and
a core health bar. Mission text and controls are outside the combat canvas
but remain inside the game frame, including in full screen.

The four-minute timer, retry/continue options, original interlude IDs, campaign
progress, and separate best-score saves remain. These are themed in-game
abilities, not live Microsoft services. Physics and mocked-canvas tests cover
the mechanics and drawing paths; visual polish, touch comfort, difficulty,
and sound balance still need human playtesting.

The racing interludes have been removed. Campus continues directly to GitHub;
Foundry continues directly to Agent City. Saves left inside a removed race resume
at the next already-unlocked world, retaining main-world progress and equipment.

Every bubble carries a multicolor Copilot symbol at each split size. Azure Orbit's
breakable tiles display Word, Excel, Outlook, Teams, and Copilot icons, with app
colors and separate durability marks. Their physical size and behavior are unchanged.

Each interlude has a timer, three health points, a score, and a win/loss screen.
A failed round offers both Retry and Continue, so an arcade break cannot block
the campaign. The level map includes unlocked interludes for replay. Best arcade
scores are stored separately from main-world scores.

### Playing A Quiz

The catalog has **8 levels x 3 quizzes x 3 questions = 72 questions**. These are
unofficial product-awareness questions, not certification or exam questions.

1. Approach a quiz terminal and press **E**, click its monitor, or select **Open quiz**.
2. Choose one of three answer cards and select **Check answer**.
3. Read the correct/incorrect feedback, correct answer, and short explanation.
4. Select **Next question**, then **See score** after the third answer.
5. Use **Retry** for another attempt or **Continue** to return to the level.

Answers are shuffled once per attempt and graded by stable option IDs, not their
screen position. Each choice is scored once. Completing all three questions earns
a checkpoint at any score; retries cannot farm the 250-point completion reward
or remove an already earned checkpoint. Empty answers do not advance the quiz.
The game freezes while the dialog is open. Closing it retains question progress
within the current run. On small screens, the question area scrolls internally.

Each platform world has three independent quiz terminals. In **Azure Orbit**,
quizzes unlock launches at sectors **1, 3, and 5**. Use the quiz ribbon while the
core is latched to revisit earlier quizzes. Flight physics, support actions,
recovery charges, and the final Core saucer sequence are unchanged.

### Editing Quizzes

Open **Preferences > Quiz editor**. Select a level and quiz, then edit its title,
product, three questions, three options per question, correct answer, optional
explanation, official reference URL, and last-verified date.

**Save locally** stores an override in this browser for new runs; an active run
keeps its existing questions. **Restore default** resets the selected quiz.
**Export saved quizzes** downloads the saved catalog as JSON. The editor does not
change repository files or publish changes. Unsaved form drafts remain in memory
while switching quizzes, but are not included in exports.

The shipped content is in [src/quiz-catalog.js](src/quiz-catalog.js). A null
`lastVerified` means the content still needs editorial verification, not that
the reference is broken. Work IQ and Cowork descriptions were checked against
Microsoft Learn on **2026-09-19**. Changing question content or its reference in
the editor clears the verification date. Link reachability alone is not treated
as fact verification. The supplied Azure AI Foundry wording refers to the product
now called Microsoft Foundry in current documentation.

Actual availability, naming, licensing, and permissions vary. Review unverified
entries and current official sources before publishing. Gameplay does not call
Microsoft services, access email, or change cloud resources or repositories.

## Run Locally

Use a current browser with JavaScript modules, import maps, Canvas 2D, and Pointer
Events. From the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

On Windows, use `py -3 -m http.server 8000 --bind 127.0.0.1`.
Open **http://127.0.0.1:8000/** and select **Start level**. Choose another free
port if 8000 is occupied. Stop the server with Ctrl+C. Opening the HTML directly
is not supported because the game uses browser modules.

No account, API key, package installation, or external game service is required.
The local browser libraries and their licenses are described in
[vendor/README.md](vendor/README.md). Optional boss speech may use an online
voice provided by your browser or operating system.

## Controls

| Action | Default Input |
| --- | --- |
| Move | A/D or Left/Right arrows |
| Jump | Hold Space or W for a full jump; Up also jumps away from ladders/ropes; release for a shorter jump |
| Climb | Keyboard Up/Down arrows near a ladder or rope; R/V also work; Space/W dismounts |
| Copilot boost | Shift; the original boost remains available |
| Melee attack | J or Attack; tap once per attack |
| Debug Blaster | Hold F or Fire after collecting a blaster |
| Command recruited companions | K or Helpers; companions also act automatically |
| Quiz interaction | E, a nearby monitor, or the docked Open quiz / Continue quiz / View score button |
| Debug Pulse | Q after GitHub; reveals resource and task markers |
| Focus Mode | Hold C after Teams to slow the game |
| Pause/resume | Escape or the in-game toolbar control |
| Saucer movement | A/D, arrows, mouse movement over the canvas, or touch dragging |
| Saucer launch/release | Space, Launch core, or a canvas tap |
| Saucer support | 1: repair net, 2: analyze targets, 3: defend shield |
| Arcade movement | A/D, Left/Right, mouse, or touch dragging |
| Arcade action | Space/F fires in Invaders and Bubble Firewall |
| Invaders tools | 1: Azure Shield, 2: Copilot Wingman, 3: Power Automate Chain, 4 or Q: Defender Pulse; icon buttons also activate stored charges |

Primary bindings can be changed in Preferences. Duplicate assignments are
rejected. Contextual arrow/W/right-Shift aliases remain unless assigned elsewhere. Touch
controls use pointer capture and clear held input on release or cancellation.

Quiz terminals open a contained dialog and freeze simulation while you choose.
Opening Preferences or the level map, changing windows, or hiding the page pauses
the game. Resume refocuses the canvas. Escape closes an open quiz before
handling gameplay pause. Dialogue captions and mouse/touch controls remain
inside the playfield.

## Team And Recovery

Hit recruitment surprise boxes from below, then collect the released reward.
Three campaign recruitment slots belong to the non-selected characters. The
first two boxes keep their existing IDs and original recruits; the third is
placed along the third chapter's main route. Older saves keep their selected
leader, existing teammates, equipment, scores, and unlocked levels.
Recruits, your selected leader, and earned blaster equipment carry into later
levels. Companions retain the original independent navigation and combat rules.
Recruited companions now pursue nearby reachable items, share pickup points and
power-ups with the leader, and keep attacking nearby opponents automatically.
There is no player-kill prerequisite for ordinary helper damage. Existing attack
cooldowns, walls, boss support caps, and the player finishing blow remain in place.

### Bumblebee

Select **Bumblebee** in the Leader menu before starting, or recruit him from
the third surprise box when playing one of the original heroes. His artwork
uses the supplied [images/BBRich.png](images/BBRich.png), including the cap,
blue headset, Microsoft-color chest panels, gold chain, and BB pendant. The
earlier [images/BB.png](images/BB.png) is not used for his sprite.

A transparent 12-part rig animates the face, blinking eyes, speaking mouth,
headset, microphone, cap, chain, and pendant independently. Hover-thruster
motion responds to movement, jumping, climbing, and boost; the original image
has no legs, so no replacement limbs are drawn. Lettering stays readable in
both facing directions. Pause freezes animation with simulation time, while
reduced motion suppresses decorative blinking and idle sway.

The usual movement, jump, keyboard climbing, boost, and blaster controls work
unchanged. **J / Attack** produces a short-range headset pulse with one damage
and a 0.6-second cooldown. Companions use the same automatic navigation,
collection, and support limits; Bumblebee cannot bypass boss shields or take
the player's finishing blow. He remains the selected pilot in interludes,
Azure Orbit, and the finale; Invaders still uses its spacecraft artwork.

[scripts/build-bumblebee-rig.swift](scripts/build-bumblebee-rig.swift) generates
the included atlas and metadata from BBRich on macOS. Run
`swift scripts/build-bumblebee-rig.swift` only when rebuilding artwork, then
`npm run build` and `npm test`. `--preview` writes a neutral-pose asset preview
to the system temporary directory. Original image files are not modified.
The generator checks preserved features and neutral-pose reconstruction;
tests cover actual recruitment, saves, controls, companion combat, and drawing.
In-game appearance and animation still need human visual validation.

Falling or losing all three health points returns you to the current checkpoint.
World retries retain collected items, used bricks, defeated enemies, completed
quizzes, and recruits. Boss retries restore health and the blaster without adding
extra quizzes. Quiz responses and earned badges survive checkpoint recovery.
Incorrect answers receive explanations and contribute zero to the quiz score.

Orbit provides three recovery charges. Only losing the last ball spends a charge;
losing one ball during multiball does not. A recovery net saves a missed ball
without spending a charge. A failed flight can retry its current wave with fresh
resources and retains its quiz progress and once-only quiz rewards. The boss
wave restores reserves on entry.

| Support Action | Compute | Cooldown |
| --- | --- | --- |
| Repair net | 30 | 9 seconds |
| Analyze targets | 20 | 8 seconds |
| Defend shield | 25 | 10 seconds |

Support uses deterministic in-game logic. It does not call live AI or Azure
services. Compute regenerates during active play and through brick hits.

The campaign save records unlocked/completed levels, selected leader, recruits,
equipment, best scores, arcade completion and best scores at progression events.
The original world indices are unchanged for existing saves. A reload restarts the current
level; exact live checkpoints, quiz attempts, and wave state are not serialized.
Older saves are left intact in their previous storage keys. Blocked storage falls
back to session-only play. Preferences use their existing save key. Quiz editor
overrides are stored separately under `cloud-quest-quizzes-v1`.

## Build And Test

After changing JavaScript or CSS, run these before publishing:

```sh
npm run build
npm test
```

Node 24+ is needed for development tests, not for browser gameplay. No package
installation is needed. The build refreshes the content-versioned import map
and stylesheet URL in [index.html](index.html); commit that HTML with the source.
The version check prevents mixed cached releases. Startup errors or a 15-second
stall show a message and **Retry loading**, without deleting saves.

The tests cover original movement, companion regressions, every platform
world's forward and return routes, all 72 answer mappings, scoring, shuffled
answer IDs, check/next feedback, retries, once-only rewards, editor validation,
catalog isolation, orbital quiz gates, campaign continuity, saves, the final
saucer transition, Orbit physics, and quiz objective guidance. A mocked-DOM test
checks the player form without opening a browser. Additional checks cover helper
collection and sustained combat, ladder/rope ascent and descent, jumping beside
climbs, preserved old platforms, arcade physics, pause, failure, replay, and saves.
Mock canvas tests verify finite drawing calls and distinct arcade scenes.
Additional regressions cover deck and block clearance, contextual arrow climbing,
travel-driven character strides, first-boss arena hops, and damage-free retreat
completion with pause/resume.
See [tests/campaign.test.mjs](tests/campaign.test.mjs) and
[tests/engine.test.mjs](tests/engine.test.mjs).

Browser and on-screen tests were not run for these changes. Manually
check answer selection, feedback, retries, editor saving, keyboard focus,
desktop/mobile dialog containment, companion collection and combat, upper routes,
climb controls, arcade difficulty, and Orbit's three quiz launch gates.

This implementation still needs uninterrupted human campaign playthroughs,
difficulty and duration tuning, real-device multitouch, broader browser and
assistive-technology testing, and listening tests of the soundtrack. Route
simulation is not a claim that the 12-18 minute targets are met. The separate
restorable hub, cosmetics, daily challenges, freeform agent authoring, and
recorded dialogue from the broader concept are not implemented.

## Code Map

- [src/campaign.js](src/campaign.js): eight world definitions, progression, and saves.
- [src/missions.js](src/missions.js): terminal interactions, dependencies, moving lifts, and objective gates.
- [src/quiz-catalog.js](src/quiz-catalog.js): all 72 product questions, answer IDs, and editorial reference metadata.
- [src/trivia-tasks.js](src/trivia-tasks.js): scored quiz attempts, shuffling, retries, and editor validation.
- [src/quiz-ui.js](src/quiz-ui.js): player form and local quiz editor.
- [src/engine.js](src/engine.js): original fixed-step platform/combat engine, parameterized per world.
- [src/world-art.js](src/world-art.js): themed architecture, platforms, terminals, and boss silhouettes.
- [src/world-routes.js](src/world-routes.js): additive upper paths, ladders, ropes, conveyors, and complexity labels.
- [src/input.js](src/input.js): customizable key resolution and contextual arrow climbing.
- [src/wizard-rig.js](src/wizard-rig.js): image-based robot joints, jumps, and defeat/escape poses.
- [src/boss-collection.js](src/boss-collection.js): themed textured boss rigs, material-specific animation, and orbital core artwork.
- [scripts/build-boss-collection.swift](scripts/build-boss-collection.swift): reproducible boss atlas generation from the supplied robot textures.
- [src/arcade.js](src/arcade.js) and [src/arcade-art.js](src/arcade-art.js): orbital Invaders waves, abilities, upgrades, defense nodes, the core encounter, and Copilot-bubble interludes.
- [src/party.js](src/party.js) and [src/party-art.js](src/party-art.js): the original team and character artwork.
- [src/bumblebee-art.js](src/bumblebee-art.js): the BBRich sprite rig, facial animation, hover motion, and headset pulse presentation.
- [src/orbit.js](src/orbit.js) and [src/orbit-art.js](src/orbit-art.js): saucer physics and the selected original pilot.
- [src/main.js](src/main.js): campaign UI, input, decisions, preferences, and lifecycle.
- [src/audio.js](src/audio.js) and [src/music.js](src/music.js): original synthesized audio and world arrangements.

Nintendo, Microsoft, and GitHub names remain their owners' trademarks. This
unofficial fan project is not affiliated with or endorsed by those companies.
Character and app illustrations combine procedural fan artwork and the supplied
robot image with themed derivatives; they are not official assets.
No official soundtrack recordings are used. Preserve all third-party licenses.

<details>
<summary>Archived Cloud Quest documentation and merge history</summary>

The following records describe earlier versions and are superseded by the
instructions and verification status above.

## Copilot Cloud Quest (Archived)

An unofficial browser platformer starring Marco through Microsoft-themed worlds, with Donkey and Mario as surprise-box helpers. Marco has black hair, a baseball cap, a T-shirt, jeans, and polarized-style sunglasses. Collect Excel sheets, Outlook emails, Word documents, Teams conversation bubbles, and Copilot ribbon icons across layered landscapes and dimensional platforms. Characters and app illustrations are custom procedural Canvas artwork, not imported official sprites or icon assets. The sunglasses are illustrative, not an official Ray-Ban asset. Mario belongs to Nintendo; Microsoft application names and marks belong to Microsoft. This project is not affiliated with or endorsed by those brands.

The optional soundtrack is an original synthesized arrangement with melody, bass, chords, percussion, and gameplay jingles. It does not use Nintendo recordings. All implementation files are present, but graphics, gameplay, browser compatibility, and audio quality still require manual validation; repository inspection is not a successful runtime test.

## Implementation and prerequisites

- A current browser with JavaScript modules, Canvas 2D, and Pointer Events support. Web Audio is optional.
- VS Code for editing, plus a local static HTTP server.
- The launch instructions below use an installed Python 3 interpreter solely as a development server. Python is not a game dependency.
- No package installation, build step, Microsoft account, or API key is required. Gameplay and synthesized music need no external service. Optional browser speech may use an online voice supplied by your browser or operating system.

Repository inspection confirms a static HTML/CSS/JavaScript application. There is no package manifest, repository-defined server command, automated test suite, or build configuration. The commands below use Python's standard-library HTTP server; they have not been executed or verified on your computer. Runtime and browser compatibility checks remain outstanding.

## Open and run in VS Code

1. Download or clone this repository and ensure your local copy includes the merged implementation PRs. For an existing clone, select the default branch where the PRs were merged, run `git status`, then `git pull --ff-only` from the repository root. Resolve any reported local-change or branch issues without discarding work. ZIP downloads must be downloaded again to receive updates.
2. In VS Code choose **File → Open Folder** and select the repository root: the folder containing `index.html`, `styles.css`, `README.md`, and `src/`. Do not open only `src/`.
3. Choose **Terminal → New Terminal**. Its working directory must be that same repository root.
4. Check your Python installation and start a loopback-only development server using the applicable commands.

Windows, with the Python launcher installed:

```sh
py -3 --version
py -3 -m http.server 8000 --bind 127.0.0.1
```

macOS/Linux, with Python 3 installed:

```sh
python3 --version
python3 -m http.server 8000 --bind 127.0.0.1
```

The version check should report Python 3; the second command should remain running and report an HTTP server on port 8000. If the interpreter is unavailable, install Python 3 or use your existing static HTTP server. If port 8000 is occupied, choose another free port and use that port in the URL.

5. Open **http://127.0.0.1:8000/** in your browser. Do not double-click `index.html`: `file://` access can prevent JavaScript modules from loading.
6. Expect a styled title screen with an enabled **Start adventure** button and a ready message. Start the adventure to focus the canvas.
7. Stop the development server with **Ctrl+C** in the VS Code terminal when finished. This server is for local development, not production hosting.

If Start remains disabled or the page is blank, inspect the browser developer console and Network panel. Confirm `styles.css` and all eighteen `src/*.js` modules, including `party.js` and `party-art.js`, load successfully from the repository root, then reload. No package installation or build step was added for the upgrade. No `npm install`, `npm run dev`, or `npm test` command is defined by this repository.

## Controls and game rules

| Action | Input |
| --- | --- |
| Move | Left/Right arrows or A/D |
| Jump | Space, W, or Up arrow; release and press again for another jump |
| Copilot boost | Shift; boosts in the facing direction with a 1.5-second cooldown |
| Pause/resume | Escape or the Pause/Resume controls |
| Touch movement | Hold the on-screen left/right buttons |
| Touch actions | Press Jump, Boost, Attack, or Helpers; hold Fire after acquiring a blaster |
| Marco kickboxing | Tap J or Attack to alternate punches and forward kicks; holding does not repeat |
| Helper attacks | Tap K or Helpers to command unlocked companions: Donkey kicks backward, Mario kicks forward |
| Debug Blaster | Hold F while the canvas is focused, or hold the on-screen Fire button |
| Header audio | Enable music/effects, or mute all sound including boss voice |
| Optional boss speech | Boss voice toggle in Sound studio; separate opt-in |
| Independent audio | Music and Effects buttons plus volume sliders in Sound studio |

Movement keys work while the game canvas has focus. Losing canvas/window focus or hiding the browser tab pauses play. Resume to refocus the canvas. Touch controls appear on narrow screens or devices reporting a coarse pointer.

Ordinary platforms are one-way; code bricks are solid on all sides. Hit ordinary bricks from underneath to break them. Question-mark reward bricks release a power-up beneath the block once, then remain solid. Touch the released Debug Blaster to enable firing.

Marco has three health points. Enemies, hostile projectiles, and pink glitches cause damage, with a brief damage-protection period. Punch, kick, or shoot ordinary enemies; glitch robots and malware worms can also be stomped from above, but spam drones cannot. Falling or losing all health returns Marco to the checkpoint and resets the current combo. World respawns retain the blaster, score, collected items, defeated enemies, used/broken bricks, and unlocked helpers while restoring health.

### Marco and surprise-box helpers

Hit the dedicated question-mark boxes from underneath, then touch the reward beneath the block. Donkey's box is on the launch platform; Mario's is on the first Outlook platform. Each unlock happens once and updates the helper status. These rewards do not increment productivity counters or replace the existing blaster rewards.

Helpers follow Marco as support companions, not independently controlled physics characters. They have no separate health or contact damage. Tap Helpers to command both unlocked companions; each attacks only when its own cooldown permits. Donkey strikes behind his facing direction, while Mario kicks forward. Marco's punches deal one damage, forward kicks deal two, and Donkey's backward kick deals three. Cooldowns are 0.36, 0.46, and 0.85 seconds respectively. Inputs during a cooldown are not queued for a later swing.

Melee has short range, hits each enemy at most once per swing, and is blocked by intact solid bricks. An attacking helper keeps its original facing and side relative to Marco until the swing ends. The contact marker indicates the attack's outer boundary. Marco's visible facing and blaster direction stay locked during his melee pose. Pink environmental glitches are hazards, not destructible enemies; the boss core still requires the blaster during exposed windows.

Helpers remain unlocked through world recovery, arena entry, and boss recovery. Recovery cancels current attacks and resets their cooldowns. Pause freezes attack timers and disables gameplay controls. Restart or Explore again creates a fresh run with both helpers locked; reloading also loses session progress.

Four-color Microsoft-style pickups grant ten seconds of protection, shown by an aura and countdown. Contact defeats ordinary enemies while protected. Protection does not prevent falling and does not bypass the boss shield. Pausing freezes gameplay timers.

Collect app items within 2.5 seconds of one another to increase the multiplier up to ×8; golden-ring upper-route items award double points. Restart and Explore again reset the run. Progress is in memory only and is lost on reload.

### Productivity scoreboard

Five counters show collected/available totals: **Emails reviewed**, **Excel files created**, **Word docs created**, **Teams conversations completed**, and **Copilot prompts completed**. Word documents appear along selected longer trails throughout the world. These are in-game achievements, not real Microsoft actions. Counts derive from unique collected item IDs, survive checkpoint recovery, and appear in the final results. Combat rewards and enemy defeats do not increment them.

### Final boss: The Hallucination Engine

The world beacon now enters a separate datacenter arena instead of ending the game. The arena supplies a blaster and its own checkpoint. Defeat the AI core to unlock final results.

- **Token Storm:** dodge projectile bursts.
- **Agent Swarm:** leave the marked column before it activates and fight summoned robots.
- **Context Collapse:** jump over floor waves or climb to elevated platforms.

Watch warnings, then fire during exposed-core windows. The right arena platform gives access to the core's height. Shielded shots do not damage it. Losing all health restarts the boss encounter with full health and a blaster, retaining world collectibles and score. Arena minions award no points, preventing repeat-reset farming.

### Moving core and personality

The boss now moves through bounded hover paths, tracks Marco with its eyes, winds up its arms before attacks, and recoils when hit. Its actual collision rectangle moves with the visible core. Decorative arms and rings are not collision targets. During exposure it moves back toward the right platform's firing height; reachability still requires play-testing.

Short event-driven lines accompany entrance, attacks, vulnerability, phase changes, and defeat. For example: “I predicted everything. Except a plumber.” Higher-priority dialogue can interrupt ordinary chatter; cooldowns limit repeated lines. Not every event necessarily produces a caption.

Speech bubbles appear above the boss. A separate **The Hallucination Engine says** panel below Sound studio retains the latest line for reading, including the defeat line, until another line or encounter reset. Captions work with voice disabled. Mouth animation follows caption activity, not actual speech phonemes.

The reduced-motion preference suppresses decorative blinking, ring rotation, and mouth oscillation. Gameplay movement, eye tracking, and attack-state poses remain so the encounter stays mechanically consistent.

## Music and effects

1. Start with a comfortable device volume. Audio starts off on each page load.
2. Click **Enable all sound**, or independently enable **Music** and **Effects** in Sound studio. Browser audio requires this user interaction.
3. Start or resume the adventure. Music plays during active gameplay, not on the title screen. Moving focus from the canvas to an audio control pauses gameplay; resume after changing preferences.
4. Adjust the independent sliders. Their initial settings are 45% music and 65% effects, but neither bus plays until enabled. A zero slider value is silent even if its button says on.
5. **Mute all sound** disables music, effects, and boss voice. **Enable all sound** enables music and effects only; speech requires its own opt-in. Use the individual controls for selective playback.

Effects include app-specific collectible tones, jump/boost sweeps, a respawn sound, checkpoint jingles, and a completion fanfare. Background music stops at completion while the enabled effects bus plays the fanfare. Pausing, hiding the tab, or losing window focus silences playback. Restart resets the musical sequence. Preferences are not saved across reloads.

If audio activation fails, the page reports it and gameplay remains available without sound. Check browser/site mute settings, device output, volume sliders, and the paused state before retrying. No downloaded audio, external music service, or credentials are required.

### Optional spoken boss dialogue

- In Sound studio, click **Boss voice: off** to enable speech, then resume if changing focus paused the game. New boss lines are spoken when gameplay is active and the page is focused; enabling voice does not replay the current line.
- Browser Speech Synthesis support is required only for voice. If unsupported, its button stays disabled while captions remain available. A browser may block playback despite exposing the API; the game reports failure and lets you retry.
- An available local English voice is preferred. Otherwise the browser chooses a voice, which may use an online service. Voice quality, latency, and offline availability depend on the browser/OS. No microphone, supplied credentials, paid API, or Microsoft environment is required. Leave voice off if you do not want possible online synthesis.
- Speech has its own toggle and fixed application volume, independent of the music/effects sliders. It is not muted by setting those sliders to zero. Use its toggle or **Mute all sound**.
- New captions replace pending speech rather than building a queue. Pause, restart, encounter reset, window blur, tab hiding, and navigation cancel the current line. Resume waits for new dialogue instead of replaying an interrupted line.
- Speech is limited to the caption's remaining display window; a slow or delayed voice may be cut short. Captions retain the complete sentence. The defeat caption remains readable outside the completion overlay.

## Local manual validation

There are **no automated tests and no test command**. The following are expected results to verify, not recorded passes. Run these checks in the browser launched above and record the browser/version, viewport, failures, and console errors.

- **Startup:** styling and scenery appear, Start becomes enabled, and no application-loading errors appear in the console. Pause and completion overlays are hidden initially.
- **Marco and scenery:** confirm Marco is the leader, with black hair, baseball cap, T-shirt, jeans, and polarized-style sunglasses. Check both facing directions, running/jumping poses, boost trails, layered backgrounds, and platform details. Inspect sprite alignment with landing surfaces; character artwork uses the existing player collision dimensions.
- **Movement:** start, move both directions, and release each key. Marco should stop rather than continue moving. Jump onto and through platforms; test edges and optional upper routes.
- **Boost:** press Shift while facing each direction. Movement should burst forward, the HUD should count down, and another boost should become available afterward.
- **Collectibles and scoring:** inspect Excel sheets, Outlook envelopes, Teams conversations, and Copilot ribbons in their respective zones. Confirm each disappears once with a short pickup effect, increases the count and score, and builds a combo when collected quickly. Check double-value upper-route items. Wait longer than 2.5 seconds of active play and expect ×1.
- **Recovery:** activate a later checkpoint and fall. Expect restored health, retained items/score, and a reset combo. Touch a glitch to check damage and temporary protection; expect respawn only when health reaches zero. Previously collected items must not award points again.
- **Pause and focus:** use Escape, Pause, Resume, switch tabs, and move focus away from the canvas. Verify simulation pauses, Resume restores keyboard play, and movement is not stuck after returning. Check mouse interactions with the header controls specifically because canvas blur also pauses the game.
- **Completion:** traverse the main route, enter the boss arena, and defeat all three phases. Confirm results appear only after boss defeat, match the HUD, and reset on Explore again. Full-level reachability and difficulty need actual play-testing.
- **Audio activation and controls:** verify silence on initial load. Enable music only and play: expect background music without action effects. Enable effects only: expect action sounds without music. Enable both, change each slider, test zero volume, and mute all. Resume after interacting with controls if canvas focus loss paused play. Unavailable audio must not prevent gameplay.
- **Soundtrack quality:** listen through several loops for timing gaps, clicks, distortion, and balance between melody, bass, chords, and percussion. Compare pickup sounds across all four app zones and check jump, boost, respawn, checkpoint, and victory sounds. These sounds have not been auditioned by the assistant.
- **Audio lifecycle:** pause/resume repeatedly, switch tabs, switch windows, and restart several times. Expect silence while paused/hidden and no overlapping soundtrack instances after restart. At completion, expect background music to stop and the enabled victory fanfare to play. Check desktop and real mobile browsers separately; browser audio policies differ.
- **Responsive/touch:** check desktop and narrow layouts, then a real touch device if available. Hold a direction while tapping Jump; release or cancel touches and verify movement stops. Browser device emulation alone does not establish real-device compatibility. The loopback server is accessible only on the computer running it; real-device testing requires a separately configured reachable static host, not an external Microsoft service.
- **Accessibility:** check visible keyboard focus, readable controls, and checkpoint/completion announcements with assistive technology. Enable the OS reduced-motion preference: decorative time-based animation should stop while gameplay movement remains. Canvas gameplay is visual; full nonvisual accessibility is not established.

### Expansion checks

No automated test suite or test command was added. Perform these additional local browser checks; expected outcomes below are not recorded passes:

- **Bricks:** test landing, side contact, underside hits, and seams between blocks. Ordinary bricks should break once; reward blocks should release one accessible pickup and remain solid afterward. Check that the first blaster can actually be collected.
- **Combat:** patrols should stay on their platforms. Test stomps, drone warning indicators, firing both directions, projectile collisions, damage grace, and releasing Fire/F. Confirm firing is unavailable before acquiring a blaster.
- **Protection:** collect a Microsoft-style pickup, verify the ten-second countdown, survive enemy contact, then verify damage resumes after expiry. Falling must still respawn Marco. Pause and confirm the timer stops.
- **Counters:** collect all five types, including Word documents. The sum of category counts must equal the overall item count. Respawning must not add counts; combat rewards must not affect them. Verify final results and new-run resets.
- **Boss:** verify arena entry, automatic blaster, health bar, attack warnings, shielded versus exposed damage, all three phases, and victory. Die during each phase and check arena reset without score farming. Test boss shots from the right platform rather than assuming reachability.
- **Boss audio:** enable music and expect a different arrangement on arena entry, with changing instrumentation across phases. Check Word pickups, firing, brick breaks, power-ups, damage, and boss warnings. Restart and switch tabs repeatedly to check for overlapping or lingering sounds. Audio quality has not been auditioned by the assistant.
- **Mobile/UI:** hold movement and Fire while tapping Jump on a real touch device when available. Check control wrapping, boss guidance, expanded/collapsed counters, and scrolling to every final-result row. Device emulation is not proof of real-device compatibility.

### Marco and helper checks

Use the same local server and browser instructions above. No automated tests or test command were added. These are expected results, not recorded passes:

- **Unlocks:** start with Marco alone and Helpers disabled. Reach each dedicated box, hit its underside, and collect its reward. Expect the correct companion, status update, and announcement exactly once, without changing productivity counts. Confirm existing blaster rewards remain available.
- **Kickboxing:** tap J or Attack repeatedly with time between swings. Expect alternating punches and kicks, no automatic repetition while held, and no extra hits on the same enemy during one swing. Test maximum range, both facing directions, and intact bricks blocking damage.
- **Helpers:** unlock Donkey and Mario, then tap K or Helpers. Expect Donkey to kick backward and Mario forward. Test each helper alone where available and both together; enemy defeat scoring must occur once per enemy. Mario's kick should animate his existing leg rather than add a third leg.
- **Turning and graphics:** reverse Marco during a helper swing. The helper must keep its starting side relative to Marco until the swing finishes. Check both directions and world boundaries. Verify contact markers match the attack boundary, including reduced motion. Fire during Marco's melee pose and confirm shots match his visible facing.
- **Box landings:** land on helper boxes and ordinary solid bricks, including near one-way platforms. Expect stable grounding, aligned feet, and the ability to jump again without falling through the box.
- **Recovery and lifecycle:** unlock both helpers, activate a checkpoint, and fall or lose health. Expect helpers to remain unlocked with no stale attacks. Verify they also survive arena entry and boss recovery. Pause mid-swing: timers must freeze and Helpers remain disabled until active play resumes. Restart and Explore again must lock both helpers.
- **Touch and regression:** on a real touch device, hold movement while tapping Attack or Helpers; verify cooldowns, release/cancellation, and control readability. Recheck collectibles, blaster access, enemy damage, and all boss phases. Emulation alone does not establish real-device compatibility.

### Animated boss and speech checks

Use the local server and VS Code working-directory instructions above. No new setup commands, build configuration, or automated tests were added. These are expected results to check, not recorded passes:

- **Moving target:** follow the core through each phase and verify shots/contact align with its rectangle, not the decorative arms. Confirm exposed windows remain hittable from the right platform and knockback does not move it out of reach.
- **Expressions:** check tracking eyes, windup arms, hit reactions, and mouth animation. Enable reduced motion and verify decorative animation stops while core movement and essential warnings remain.
- **Dialogue:** observe entrance, attacks, exposure, phase changes, and defeat. Check readable bubbles without covering attack instructions, limited repetition, and the retained caption beneath Sound studio. Test narrow screens and browser zoom.
- **Optional voice:** verify voice starts off; captions work without it; enabling music/effects alone does not enable speech. Enable voice separately and check available browser voices. An unavailable or blocked voice must not prevent gameplay.
- **Cancellation:** while a line speaks, pause, switch tabs/windows, restart, mute all, or disable voice. Expect speech to stop without stale lines playing later. Test defeat speech and boss-checkpoint reset separately.
- **Accessibility:** check the external caption panel with a screen reader. Optional synthesized voice can overlap assistive speech; leave boss voice off when testing caption announcements alone. Full nonvisual gameplay accessibility is not established.

No browser execution, voice audition, or successful test results are claimed for this upgrade. Online browser voices and publishing are external checks, separate from the local game/server checks. Do not treat generated implementation or merged PRs as proof these checks pass. Validate before deployment.

For an existing manually uploaded static site, update it only after validation. Upload `index.html`, `styles.css`, and the complete `src/` folder to that same site's deployment interface. Keep `index.html` at the upload root; exclude `.git`, credentials, and private files. No build command is needed. Hosting is external to local VS Code checks, and deployed JavaScript is visible to visitors.

## File map and shared interfaces

- `index.html`: game shell, HUD, menus, instructions, and canvas.
- `styles.css`: responsive interface, overlays, focus styling, and touch controls.
- `src/level.js`: immutable world data, app palette, viewport, and physics constants.
- `src/art.js`: `render(context, state, reducedMotion)` integrates graphics and transient pickup effects without changing simulation state. The old renderer remains in the file but is inactive.
- `src/character.js`: procedural Mario helper drawing, including an optional kick pose.
- `src/party.js`: character definitions, helper unlocks, following positions, attack timing/hitboxes, per-swing hit tracking, and recovery reset contracts.
- `src/party-art.js`: procedural Marco/Donkey artwork and shared party rendering; delegates Mario artwork to `character.js` without changing simulation state.
- `src/collectibles.js`: app-item illustrations and short pickup effects.
- `src/scenery.js`: viewport-space backgrounds and world-space platforms.
- `src/music.js`: original score, voice definitions, and checkpoint/completion jingles; no playback side effects.
- `src/audio.js`: `createAudio()` provides user-activated `unlock()`, independent `setVolume()`, `setStatus()`, event-driven `effect()`, `reset()`, and `dispose()`.
- `src/engine.js`: `createState()`, `setPaused(state, paused)`, and `update(state, input, dt)`; updates use seconds and return gameplay events.
- `src/main.js`: DOM integration, input, animation loop, audio controls/lifecycle, and UI updates.

Additional expansion modules:

- `src/encounters.js`: immutable patrols, reward blocks, combat settings, and boss arena definitions.
- `src/blocks.js`: solid collisions, brick destruction, and one-time rewards.
- `src/combat.js`: health, enemies, projectiles, stomps, timed protection, and party melee damage with solid-brick obstruction.
- `src/boss.js`: moving core, reactions, warnings, attacks, vulnerability windows, and defeat logic.
- `src/boss-dialogue.js`: simulation-timed dialogue selection, priorities, cooldowns, and encounter-local repetition tracking.
- `src/enemy-art.js`: enemies, projectiles, and power-up illustrations.
- `src/boss-art.js`: datacenter background, expressive core artwork, attack telegraphs, and speech bubbles. `src/main.js` connects retained accessible captions and optional browser speech with lifecycle cancellation.

The engine distinguishes `world` and `boss` stages. Audio exposes `setStage(stage, phase)` for the original boss arrangement; combat cues use the existing effects bus. `level.js` exports category labels, totals, and `productivityCounts(collected)` for the HUD and results.

Internal names such as `LEVEL.sparks`, `spark` events, and `sparks-value` DOM IDs are retained for compatibility; the displayed collectibles are now Microsoft-themed items, not stars.

All development checks above are local VS Code/browser work. No Exchange environment, Microsoft 365 tenant, Copilot API, authentication, or credentials are involved; Microsoft applications are visual themes rather than service integrations.

## Merge history

The historical entries below describe individual PRs, not successful test results.

<!-- bumblebee-pr-1 -->
### Merged change: Create Copilot Cloud Quest game shell

Merged pull request #1: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/1

Files in the approved proposal:
- index.html

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-3 -->
### Merged change: Add responsive cloud-themed game styling

Merged pull request #3: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/3

Files in the approved proposal:
- styles.css

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-5 -->
### Merged change: Replace empty stylesheet with complete cloud-themed interface

Merged pull request #5: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/5

Files in the approved proposal:
- styles.css

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-7 -->
### Merged change: Add handcrafted Microsoft-themed platform level

Merged pull request #7: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/7

Files in the approved proposal:
- src/level.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-9 -->
### Merged change: Add procedural cloud-world graphics and explorer renderer

Merged pull request #9: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/9

Files in the approved proposal:
- src/art.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-11 -->
### Merged change: Add platform physics, checkpoints, and scoring engine

Merged pull request #11: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/11

Files in the approved proposal:
- src/engine.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-13 -->
### Merged change: Connect game loop, controls, menus, and audio

Merged pull request #13: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/13

Files in the approved proposal:
- src/main.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-15 -->
### Merged change: Document local setup, game controls, and manual validation

Merged pull request #15: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/15

Files in the approved proposal:
- README.md

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-17 -->
### Merged change: Add animated Canvas Mario character module

Merged pull request #17: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/17

Files in the approved proposal:
- src/character.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-19 -->
### Merged change: Add Microsoft-themed collectible graphics and pickup effects

Merged pull request #19: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/19

Files in the approved proposal:
- src/collectibles.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-21 -->
### Merged change: Add layered Microsoft-themed scenery and dimensional platforms

Merged pull request #21: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/21

Files in the approved proposal:
- src/scenery.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-23 -->
### Merged change: Add original layered soundtrack arrangement and jingles

Merged pull request #23: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/23

Files in the approved proposal:
- src/music.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-25 -->
### Merged change: Add synthesized music and gameplay audio engine

Merged pull request #25: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/25

Files in the approved proposal:
- src/audio.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-27 -->
### Merged change: Integrate Mario, Microsoft collectibles, and upgraded scenery

Merged pull request #27: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/27

Files in the approved proposal:
- src/art.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-29 -->
### Merged change: Update Mario adventure descriptions and prepare independent audio controls

Merged pull request #29: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/29

Files in the approved proposal:
- index.html

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-31 -->
### Merged change: Connect soundtrack, independent audio controls, and collectible sounds

Merged pull request #31: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/31

Files in the approved proposal:
- src/main.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-33 -->
### Merged change: Document Mario graphics, app collectibles, and soundtrack validation

Merged pull request #33: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/33

Files in the approved proposal:
- README.md

Bumblebee has not run automated tests or verified runtime behavior for this change.

<!-- bumblebee-pr-35 -->
### Merged change: Define software enemies, reward bricks, and AI boss arena

Merged pull request #35: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/35

Files in the approved proposal:
- src/encounters.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-37 -->
### Merged change: Add solid brick collisions and one-time reward spawning

Merged pull request #37: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/37

Files in the approved proposal:
- src/blocks.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-39 -->
### Merged change: Add software enemy combat and timed protection

Merged pull request #39: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/39

Files in the approved proposal:
- src/combat.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-41 -->
### Merged change: Add AI boss phases, telegraphed attacks, and vulnerability windows

Merged pull request #41: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/41

Files in the approved proposal:
- src/boss.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-43 -->
### Merged change: Add software enemy artwork and combat pickup graphics

Merged pull request #43: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/43

Files in the approved proposal:
- src/enemy-art.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-45 -->
### Merged change: Add AI boss artwork, datacenter arena, and attack telegraphs

Merged pull request #45: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/45

Files in the approved proposal:
- src/boss-art.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-47 -->
### Merged change: Prepare Word document collectible artwork

Merged pull request #47: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/47

Files in the approved proposal:
- src/collectibles.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-49 -->
### Merged change: Add Word collectibles and shared productivity counter definitions

Merged pull request #49: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/49

Files in the approved proposal:
- src/level.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-51 -->
### Merged change: Integrate bricks, combat, and boss-stage simulation

Merged pull request #51: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/51

Files in the approved proposal:
- src/engine.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-53 -->
### Merged change: Render combat encounters, protection aura, and AI boss arena

Merged pull request #53: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/53

Files in the approved proposal:
- src/art.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-55 -->
### Merged change: Add three-phase original AI boss soundtrack

Merged pull request #55: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/55

Files in the approved proposal:
- src/music.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-57 -->
### Merged change: Add combat audio cues and stage-aware boss music switching

Merged pull request #57: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/57

Files in the approved proposal:
- src/audio.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-59 -->
### Merged change: Add combat HUD, productivity counters, and fire-control markup

Merged pull request #59: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/59

Files in the approved proposal:
- index.html

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-61 -->
### Merged change: Style combat dashboard and responsive productivity counters

Merged pull request #61: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/61

Files in the approved proposal:
- styles.css

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-63 -->
### Merged change: Connect combat controls, productivity scoreboard, and boss audio

Merged pull request #63: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/63

Files in the approved proposal:
- src/main.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-65 -->
### Merged change: Document combat expansion, productivity counters, and boss validation

Merged pull request #65: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/65

Files in the approved proposal:
- README.md

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-67 -->
### Merged change: Add event-driven AI boss dialogue and repetition controls

Merged pull request #67: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/67

Files in the approved proposal:
- src/boss-dialogue.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-69 -->
### Merged change: Add moving AI core, combat reactions, and dialogue events

Merged pull request #69: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/69

Files in the approved proposal:
- src/boss.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-71 -->
### Merged change: Animate boss expressions, attack poses, and dialogue bubbles

Merged pull request #71: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/71

Files in the approved proposal:
- src/boss-art.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-73 -->
### Merged change: Prepare optional boss voice control and accessible dialogue captions

Merged pull request #73: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/73

Files in the approved proposal:
- index.html

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-75 -->
### Merged change: Connect accessible boss captions and optional browser speech

Merged pull request #75: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/75

Files in the approved proposal:
- src/main.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-77 -->
### Merged change: Document animated boss dialogue and optional browser speech

Merged pull request #77: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/77

Files in the approved proposal:
- README.md

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-82 -->
### Merged change: Add procedural Marco and helper character artwork

Merged pull request #82: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/82

Files in the approved proposal:
- src/party-art.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-101 -->
### Merged change: Add physics-based platform navigation for independent companions

Merged pull request #101: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/101

Files in the approved proposal:
- src/party-navigation.js

Bumblebee has not run automated tests or verified runtime behavior for this change.


<!-- bumblebee-pr-104 -->
### Merged change: Add event-driven Copilot jokes and character caption state

Merged pull request #104: https://github.com/MarcoLFrancisco/Super-Mario-Copilot/pull/104

Files in the approved proposal:
- src/party-dialogue.js

Bumblebee has not run automated tests or verified runtime behavior for this change.

</details>
