# Copilot Cloud Quest

An unofficial Mario browser platformer through Microsoft-themed worlds. Collect Excel sheets, Outlook emails, Teams conversation bubbles, and Copilot ribbon icons across layered landscapes and dimensional platforms. Mario and the app illustrations are custom procedural Canvas artwork, not imported official sprites or icon assets. Mario belongs to Nintendo; Microsoft application names and marks belong to Microsoft. This project is not affiliated with or endorsed by either company.

The optional soundtrack is an original synthesized arrangement with melody, bass, chords, percussion, and gameplay jingles. It does not use Nintendo recordings. All implementation files are present, but graphics, gameplay, browser compatibility, and audio quality still require manual validation; repository inspection is not a successful runtime test.

## Implementation and prerequisites

- A current browser with JavaScript modules, Canvas 2D, and Pointer Events support. Web Audio is optional.
- VS Code for editing, plus a local static HTTP server.
- The launch instructions below use an installed Python 3 interpreter solely as a development server. Python is not a game dependency.
- No package installation, build step, Microsoft account, API key, or external service is required.

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

If Start remains disabled or the page is blank, inspect the browser developer console and Network panel. Confirm `styles.css` and all fifteen `src/*.js` modules load successfully from the repository root, then reload. No package installation or build step was added for the upgrade. No `npm install`, `npm run dev`, or `npm test` command is defined by this repository.

## Controls and game rules

| Action | Input |
| --- | --- |
| Move | Left/Right arrows or A/D |
| Jump | Space, W, or Up arrow; release and press again for another jump |
| Copilot boost | Shift; boosts in the facing direction with a 1.5-second cooldown |
| Pause/resume | Escape or the Pause/Resume controls |
| Touch movement | Hold the on-screen left/right buttons |
| Touch actions | Press Jump or Boost; hold Fire after acquiring a blaster |
| Debug Blaster | Hold F while the canvas is focused, or hold the on-screen Fire button |
| All audio | Enable all sound / Mute all sound in the header |
| Independent audio | Music and Effects buttons plus volume sliders in Sound studio |

Movement keys work while the game canvas has focus. Losing canvas/window focus or hiding the browser tab pauses play. Resume to refocus the canvas. Touch controls appear on narrow screens or devices reporting a coarse pointer.

Ordinary platforms are one-way; code bricks are solid on all sides. Hit ordinary bricks from underneath to break them. Question-mark reward bricks release a power-up beneath the block once, then remain solid. Touch the released Debug Blaster to enable firing.

Mario has three health points. Enemies, hostile projectiles, and pink glitches cause damage, with a brief damage-protection period. Stomp glitch robots and malware worms from above or shoot them; spam drones cannot be stomped. Falling or losing all health returns Mario to the checkpoint and resets the current combo. World respawns retain the blaster, score, collected items, defeated enemies, and used/broken bricks while restoring health.

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

## Music and effects

1. Start with a comfortable device volume. Audio starts off on each page load.
2. Click **Enable all sound**, or independently enable **Music** and **Effects** in Sound studio. Browser audio requires this user interaction.
3. Start or resume the adventure. Music plays during active gameplay, not on the title screen. Moving focus from the canvas to an audio control pauses gameplay; resume after changing preferences.
4. Adjust the independent sliders. Their initial settings are 45% music and 65% effects, but neither bus plays until enabled. A zero slider value is silent even if its button says on.
5. **Mute all sound** disables both buses. If either is enabled, the header button mutes both; use the individual buttons for selective playback.

Effects include app-specific collectible tones, jump/boost sweeps, a respawn sound, checkpoint jingles, and a completion fanfare. Background music stops at completion while the enabled effects bus plays the fanfare. Pausing, hiding the tab, or losing window focus silences playback. Restart resets the musical sequence. Preferences are not saved across reloads.

If audio activation fails, the page reports it and gameplay remains available without sound. Check browser/site mute settings, device output, volume sliders, and the paused state before retrying. No downloaded audio, external music service, or credentials are required.

## Local manual validation

There are **no automated tests and no test command**. The following are expected results to verify, not recorded passes. Run these checks in the browser launched above and record the browser/version, viewport, failures, and console errors.

- **Startup:** styling and scenery appear, Start becomes enabled, and no application-loading errors appear in the console. Pause and completion overlays are hidden initially.
- **Mario and scenery:** confirm Mario replaces the robot, with a red cap, moustache, overalls, and running/jumping poses. Check both facing directions, boost trails, layered backgrounds, and platform details. Inspect sprite alignment with landing surfaces; visual changes did not change the player collision dimensions.
- **Movement:** start, move both directions, and release each key. Mario should stop rather than continue moving. Jump onto and through platforms; test edges and optional upper routes.
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
- **Protection:** collect a Microsoft-style pickup, verify the ten-second countdown, survive enemy contact, then verify damage resumes after expiry. Falling must still respawn Mario. Pause and confirm the timer stops.
- **Counters:** collect all five types, including Word documents. The sum of category counts must equal the overall item count. Respawning must not add counts; combat rewards must not affect them. Verify final results and new-run resets.
- **Boss:** verify arena entry, automatic blaster, health bar, attack warnings, shielded versus exposed damage, all three phases, and victory. Die during each phase and check arena reset without score farming. Test boss shots from the right platform rather than assuming reachability.
- **Boss audio:** enable music and expect a different arrangement on arena entry, with changing instrumentation across phases. Check Word pickups, firing, brick breaks, power-ups, damage, and boss warnings. Restart and switch tabs repeatedly to check for overlapping or lingering sounds. Audio quality has not been auditioned by the assistant.
- **Mobile/UI:** hold movement and Fire while tapping Jump on a real touch device when available. Check control wrapping, boss guidance, expanded/collapsed counters, and scrolling to every final-result row. Device emulation is not proof of real-device compatibility.

Do not treat the generated implementation or merged PRs as proof these checks pass. Validate before deployment.

For an existing manually uploaded static site, update it only after validation. Upload `index.html`, `styles.css`, and the complete `src/` folder to that same site's deployment interface. Keep `index.html` at the upload root; exclude `.git`, credentials, and private files. No build command is needed. Hosting is external to local VS Code checks, and deployed JavaScript is visible to visitors.

## File map and shared interfaces

- `index.html`: game shell, HUD, menus, instructions, and canvas.
- `styles.css`: responsive interface, overlays, focus styling, and touch controls.
- `src/level.js`: immutable world data, app palette, viewport, and physics constants.
- `src/art.js`: `render(context, state, reducedMotion)` integrates graphics and transient pickup effects without changing simulation state. The old renderer remains in the file but is inactive.
- `src/character.js`: procedural Mario drawing from the engine player state.
- `src/collectibles.js`: app-item illustrations and short pickup effects.
- `src/scenery.js`: viewport-space backgrounds and world-space platforms.
- `src/music.js`: original score, voice definitions, and checkpoint/completion jingles; no playback side effects.
- `src/audio.js`: `createAudio()` provides user-activated `unlock()`, independent `setVolume()`, `setStatus()`, event-driven `effect()`, `reset()`, and `dispose()`.
- `src/engine.js`: `createState()`, `setPaused(state, paused)`, and `update(state, input, dt)`; updates use seconds and return gameplay events.
- `src/main.js`: DOM integration, input, animation loop, audio controls/lifecycle, and UI updates.

Additional expansion modules:

- `src/encounters.js`: immutable patrols, reward blocks, combat settings, and boss arena definitions.
- `src/blocks.js`: solid collisions, brick destruction, and one-time rewards.
- `src/combat.js`: health, enemies, projectiles, stomps, and timed protection.
- `src/boss.js`: boss warnings, attacks, vulnerability windows, and defeat logic.
- `src/enemy-art.js`: enemies, projectiles, and power-up illustrations.
- `src/boss-art.js`: datacenter background, core artwork, and attack telegraphs.

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
