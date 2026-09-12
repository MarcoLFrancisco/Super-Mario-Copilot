# Copilot Cloud Quest

An eight-level Microsoft AI-themed campaign extending the original platform game.
Choose **Marco, Mario, or Donkey**, recruit the other two, and keep your existing
combat, blaster, checkpoints, and companions as you travel through the worlds.
There are no replacement protagonists or separate Campus/Team Quest/Orbit modes.

The playfield uses the available page width, up to 1600 pixels, without a
viewport-height width cap. A full-screen control is available. The original
character art, attacks, recruitment, and independent companion AI are reused.

## The Campaign

| Level | World | Playable Theme | Boss |
| --- | --- | --- | --- |
| 1 | Copilot Campus | Optional suggestion bridge, pair construction, lab restoration, glass architecture and keyboard platforms | The Setup Wizard |
| 2 | GitHub Copilot | Branching routes, delegated repair, load tests, bridge inspection, repository trees | The Merge Monster |
| 3 | Cowork Central | Bounded plans, missing context, queued construction, approval, oversized bookshelves | The Scope Creep |
| 4 | AI Foundry | Module choice, safe evaluation, staged deployment, rollback, conveyors and lifts | The Unstable Deployment |
| 5 | Agent City | Dependent team assignments, signed evidence, scoped permissions, transit networks | The Infinite Planner |
| 6 | Teams Tower | Shared objective, recovered decision, synchronized elevators, three audio systems | The Meeting Overlord |
| 7 | Azure Orbit | Five brick-breaking waves, portals, power-ups, resource-limited team support, selected character in the saucer | The Orbital Firewall |
| 8 | The Intelligence Core | Combined environments, multi-step repair, low gravity, command systems, final saucer phase | Doctor Null and the Legacy Monolith |

Each platform world has its own route, four named chapter checkpoints, secret
platforms, app collectibles, original combat encounters, mission terminals,
boss objectives, artwork, dialogue, and musical arrangement. Main routes allow
return visits without spending resources or relying on optional upgrades.

Complete the required world tasks to enter its boss arena. Restore the arena's
control systems, then attack during exposed windows. Finishing a level unlocks
the next one and shows **Next: [world name]**. **Levels** opens the campaign map;
unlocked worlds can be replayed. Azure Orbit is level seven, not a simulator.
The final world transitions from the platform encounter into a saucer finale.

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
| Jump | Hold Space, W, or Up for a full jump; release for a shorter jump |
| Copilot boost | Shift; the original boost remains available |
| Melee attack | J or Attack; tap once per attack |
| Debug Blaster | Hold F or Fire after collecting a blaster |
| Command recruited companions | K or Helpers; companions also act automatically |
| Terminal interaction | E or the contextual button below the canvas |
| Debug Pulse | Q after GitHub; reveals resource and task markers |
| Focus Mode | Hold C after Teams to slow the game |
| Pause/resume | Escape or the header control |
| Saucer movement | A/D, arrows, mouse movement over the canvas, or touch dragging |
| Saucer launch/release | Space, Launch core, or a canvas tap |
| Saucer support | 1: repair net, 2: analyze targets, 3: defend shield |

Primary bindings can be changed in Preferences. Duplicate assignments are
rejected. Arrow/W/right-Shift aliases remain unless assigned elsewhere. Touch
controls use pointer capture and clear held input on release or cancellation.

Mission decisions open a contextual dialog and slow simulation while you choose.
Opening Preferences or the level map, changing windows, or hiding the page pauses
the game. Resume refocuses the canvas. Dialogue captions sit outside the playfield.

## Team And Recovery

Hit recruitment surprise boxes from below, then collect the released reward.
The two recruitment slots belong to the non-selected original characters.
Recruits, your selected leader, and earned blaster equipment carry into later
levels. Companions retain the original independent navigation and combat rules.

Falling or losing all three health points returns you to the current checkpoint.
World retries retain collected items, used bricks, defeated enemies, completed
tasks, and recruits. Boss retries restore health and the blaster and reset the
arena task sequence. Repeating those tasks does not award their points again.

Pair construction runs while you remain at its terminal. Delegated construction
can run while you explore, but waits for missing dependencies or context. Wrong
plans and failed evaluations leave the live route unchanged. Failed deployments
must be explicitly rolled back. Model categories are fictional puzzle mechanics,
not a representation of actual model availability or product guarantees.

Orbit provides three recovery charges. Only losing the last ball spends a charge;
losing one ball during multiball does not. A recovery net saves a missed ball
without spending a charge. A failed flight can retry its current wave with fresh
resources. The boss wave restores reserves on entry.

| Support Action | Compute | Cooldown |
| --- | --- | --- |
| Repair net | 30 | 9 seconds |
| Analyze targets | 20 | 8 seconds |
| Defend shield | 25 | 10 seconds |

Support uses deterministic in-game logic. It does not call live AI or Azure
services. Compute regenerates during active play and through brick hits.

The campaign save records unlocked/completed levels, selected leader, recruits,
equipment, and best scores at progression events. A reload restarts the current
level; exact live checkpoints, task queues, and wave state are not serialized.
Older saves are left intact in their previous storage keys. Blocked storage falls
back to session-only play. Preferences use their existing save key.

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

The 53 passing tests cover original movement, all 16 companion regressions,
every platform world's forward and return route connections, required world and
boss tasks, safe plan/evaluation failures, queued dependencies, rollback,
campaign continuity, saves, the final saucer transition, and Orbit physics.
See [tests/campaign.test.mjs](tests/campaign.test.mjs) and
[tests/engine.test.mjs](tests/engine.test.mjs).

Browser checks include the large desktop canvas, all eight world renderers,
the original selected character in Orbit, a real saucer launch and repair action,
Campus bridge approval, Cowork plan rejection/acceptance, Preferences focus,
and the eight-level map at desktop and emulated 390x844 phone sizes. Tests that
start later levels use temporary campaign-save fixtures, restored afterward.

This implementation still needs uninterrupted human campaign playthroughs,
difficulty and duration tuning, real-device multitouch, broader browser and
assistive-technology testing, and listening tests of the soundtrack. Route
simulation is not a claim that the 12-18 minute targets are met. The separate
restorable hub, cosmetics, daily challenges, freeform agent authoring, and
recorded dialogue from the broader concept are not implemented.

## Code Map

- [src/campaign.js](src/campaign.js): eight world definitions, progression, and saves.
- [src/missions.js](src/missions.js): terminal interactions, dependencies, moving lifts, and objective gates.
- [src/engine.js](src/engine.js): original fixed-step platform/combat engine, parameterized per world.
- [src/world-art.js](src/world-art.js): themed architecture, platforms, terminals, and boss silhouettes.
- [src/party.js](src/party.js) and [src/party-art.js](src/party-art.js): the original team and character artwork.
- [src/orbit.js](src/orbit.js) and [src/orbit-art.js](src/orbit-art.js): saucer physics and the selected original pilot.
- [src/main.js](src/main.js): campaign UI, input, decisions, preferences, and lifecycle.
- [src/audio.js](src/audio.js) and [src/music.js](src/music.js): original synthesized audio and world arrangements.

Nintendo, Microsoft, and GitHub names remain their owners' trademarks. This
unofficial fan project is not affiliated with or endorsed by those companies.
Character and app illustrations are procedural fan artwork, not official assets.
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
