# Mission Copilot

A first playable milestone of **Microsoft AI: Mission Copilot**, an unofficial
adventure starring original characters Bit and Sparq. Doctor Null has frozen the
campus in an endless approval meeting. Restore access, repair the Setup Wizard,
and take a flying saucer into the Orbit simulator.

This is a compact playable prototype, **not the full eight-world campaign** in
the design brief. The AI agents are deterministic game mechanics, not live
Copilot or Azure integrations. Compute is an in-game resource, not a cloud quota.

## Playable Now

- **Copilot Campus:** courtyard, keyboard gardens, innovation lab, optional upper
	routes, patrolling enemies, corruption hazards, and four checkpoints.
- **Assistance with a choice:** two dotted bridge proposals become solid only
	after nearby approval. Both gaps also have an unassisted recovery route.
- **Movement:** acceleration, variable-height jumps, coyote time, jump buffering,
	and a story-unlocked Copilot Dash. Essential routes do not require the dash.
- **The Setup Wizard:** telegraphed loading rings, three restart-switch strikes,
	a fair boss checkpoint, and a locked exit until the repair is complete.
- **Azure Orbit simulator:** five waves, armored blocks, paired portals, moving
	barriers, telegraphed missiles, and a rotating Orbital Firewall encounter.
- **A visible pilot:** Bit sits inside the saucer with his backpack connected to
	the ship; Sparq is beside the controls. Shield contact position controls rebounds.
- **Agent assignments:** Patch restores a recovery net, Query marks priority
	targets, and Aegis intercepts missiles. Each has a compute cost and cooldown.
- **Power-ups:** Wide Shield, Multiball, Magnetic Catch, Debug Laser, Recovery Net.
- **Preferences:** remappable primary keys, independent music/effects controls,
	reduced motion, high-contrast markers, subtitles, and zero-default Campus shake.

## Run Locally

Use a current browser with JavaScript modules, Canvas 2D, and Pointer Events.
Web Audio is optional. From the repository root on macOS/Linux:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

On Windows with the Python launcher:

```sh
py -3 -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000/** and select **Begin mission**. If port 8000 is already
occupied, use another free port. Stop the server with Ctrl+C.

No build, package installation, account, API key, or external service is required
to play. Browser libraries are bundled locally with their licenses in
[vendor/README.md](vendor/README.md). Do not open the HTML directly: browser
module loading requires HTTP. After editing modules, use a hard reload if old
artwork or behavior remains cached.

## Controls

| Action | Default Input |
| --- | --- |
| Move | A/D or Left/Right arrows |
| Jump | Hold Space, W, or Up; release for a shorter jump |
| Approve a nearby bridge | E or the contextual Accept bridge button |
| Copilot Dash | Shift, after completing Campus |
| Pause/resume | Escape or the header Pause/Resume control |
| Campus pointer controls | Hold the on-screen arrows and Jump button |
| Orbit saucer | A/D, arrows, mouse movement over the canvas, or touch dragging |
| Orbit launch/release | Space, Launch core, or a canvas tap |
| Orbit agents | 1: Patch, 2: Query, 3: Aegis, or their buttons |
| Preferences | Sliders icon in the header |

Primary keys can be remapped in Preferences; duplicate assignments are rejected.
Arrow/W/right-Shift aliases remain available unless explicitly assigned to another
action. Escape remains the pause key. Keyboard gameplay targets the focused canvas.
Opening Preferences, changing window focus, or hiding the page pauses the game.
Resume refocuses the canvas. Touch controls use pointer capture and clear held
input on release/cancellation.

## Recovery And Progress

Campus falls and enemy contact return Bit to the last checkpoint without removing
collected cells or approved bridges. Cells cannot be farmed through repeated
deaths. An unfinished Wizard fight resets to full health on a retry. Completing
Campus unlocks both Dash and the Orbit simulator, including Dash on later replays.

Orbit begins with three recovery charges. Losing the last ball spends one charge
and relatches a fresh core; losing one ball during multiball does not spend a
charge. Recovery nets bounce a missed core without spending a charge. Once no
charges remain, another last-ball loss ends the flight. Retry sector restarts the
current wave with full resources; the Firewall wave also restores reserves on entry.

| Agent | Compute | Cooldown | Task |
| --- | --- | --- | --- |
| Patch | 30 | 9 seconds | Add one recovery net charge |
| Query | 20 | 8 seconds | Highlight three priority targets |
| Aegis | 25 | 10 seconds | Block missile damage for eight seconds |

Compute regenerates during active play and is replenished by brick hits. Agent
tasks within their assigned role execute immediately, without another approval.

Campus awards Explorer for at least ten secret cells, Debugger for repairing the
Wizard, and Collaborator for approving both bridges. Badges are optional.

Completion unlocks, best scores, and preferences are saved in local storage.
Current-run checkpoints, collected cells, and Orbit waves are kept in memory
only and are not restored after a reload. Blocked storage falls back to a playable
session-only game. Sound starts off on a fresh profile and needs a user gesture.
Dialogue is text-only; there is no voice track or dialogue-volume control yet.

## Verification

Node 24 or newer is needed for development tests, not for browser gameplay:

```sh
npm test
```

This runs the 25 checks in [tests/engine.test.mjs](tests/engine.test.mjs), using
Node's built-in test runner with no installation step. The same suite can be run
with `node --test tests/engine.test.mjs`.

Checks cover jump behavior, edge grace, buffering, pause, approvals, retries,
each required unassisted route connection, boss-switch reachability, progression,
Planck collisions, rebound angles, multiball recovery, agent budgets, portals,
missiles, power-ups, sector checkpoints, and game-over rules.

Browser smoke checks were performed on 2026-09-12 at desktop 1440x900 and emulated
phone 390x844: startup, nonblank canvas/pilot pixels, horizontal overflow, keyboard
bridge approval, remapped jumping, conflicting bindings, pointer controls,
pause/resume focus, independent effects activation, subtitles, Orbit launch, and
Patch assignment. Orbit checks used a temporary completed-Campus save fixture.

Real-device multitouch, Safari/Firefox, assistive-technology usability, soundtrack
listening/balance, and uninterrupted human playthroughs still need validation.
Per-connection reachability tests are not a full human difficulty assessment.

## Next Milestones

The remaining six campaign worlds, the fully restorable Reboot Campus hub,
command wheel, ladders, collapsing/moving Campus platforms, advanced delegation
and model-evaluation puzzles, Capability Map, cosmetics, daily challenges, and
voiced dialogue are not implemented. The full campaign's 12-18 minute level
targets have not been met or validated by this compact milestone.

## Code Map

- [src/engine.js](src/engine.js): fixed-step Campus simulation and event API.
- [src/level.js](src/level.js): immutable Campus geometry and mission configuration.
- [src/orbit.js](src/orbit.js): Planck physics, waves, agents, and recovery rules.
- [src/art.js](src/art.js), [src/character.js](src/character.js), and
	[src/orbit-art.js](src/orbit-art.js): procedural world and character artwork.
- [src/main.js](src/main.js): mode selection, input, focus, preferences, and saves.
- [src/audio.js](src/audio.js) and [src/music.js](src/music.js): synthesized audio.
- [index.html](index.html) and [styles.css](styles.css): responsive, accessible UI.

Microsoft and GitHub names remain their owners' trademarks. This fan project is
not affiliated with or endorsed by either company. Bit, Sparq, and the active
game artwork are original; no official character sprites or soundtrack recordings
are used. Preserve the included third-party library licenses when redistributing.

<details>
<summary>Archived Cloud Quest documentation and merge history</summary>

The following records describe earlier versions and are superseded by the
instructions and verification status above.

## Copilot Cloud Quest (Archived)

An unofficial Mario browser platformer through Microsoft-themed worlds. Collect Excel sheets, Outlook emails, Teams conversation bubbles, and Copilot ribbon icons across layered landscapes and dimensional platforms. Mario and the app illustrations are custom procedural Canvas artwork, not imported official sprites or icon assets. Mario belongs to Nintendo; Microsoft application names and marks belong to Microsoft. This project is not affiliated with or endorsed by either company.

The optional soundtrack is an original synthesized arrangement with melody, bass, chords, percussion, and gameplay jingles. It does not use Nintendo recordings. All implementation files are present, but graphics, gameplay, browser compatibility, and audio quality still require manual validation; repository inspection is not a successful runtime test.

## Implementation and prerequisites

- A current browser with JavaScript modules, Canvas 2D, and Pointer Events support. Web Audio is optional.
- VS Code for editing, plus a local static HTTP server.
- The launch instructions below use an installed Python 3 interpreter solely as a development server. Python is not a game dependency.
- No package installation, build step, Microsoft account, API key, or external service is required.

Repository inspection confirms a static HTML/CSS/JavaScript application. There is no package manifest, repository-defined server command, automated test suite, or build configuration. The commands below use Python's standard-library HTTP server; they have not been executed or verified on your computer. Runtime and browser compatibility checks remain outstanding.

## Open and run in VS Code

1. Download or clone this repository and ensure your local copy includes the merged implementation PRs.
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

If Start remains disabled or the page is blank, inspect the browser developer console and Network panel. Confirm `styles.css` and all nine `src/*.js` modules load successfully from the repository root, then reload. No package installation or build step was added for the upgrade. No `npm install`, `npm run dev`, or `npm test` command is defined by this repository.

## Controls and game rules

| Action | Input |
| --- | --- |
| Move | Left/Right arrows or A/D |
| Jump | Space, W, or Up arrow; release and press again for another jump |
| Copilot boost | Shift; boosts in the facing direction with a 1.5-second cooldown |
| Pause/resume | Escape or the Pause/Resume controls |
| Touch movement | Hold the on-screen left/right buttons |
| Touch actions | Press Jump or Boost |
| All audio | Enable all sound / Mute all sound in the header |
| Independent audio | Music and Effects buttons plus volume sliders in Sound studio |

Movement keys work while the game canvas has focus. Losing canvas/window focus or hiding the browser tab pauses play. Resume to refocus the canvas. Touch controls appear on narrow screens or devices reporting a coarse pointer.

Platforms are one-way: jump through their undersides and land on top. Touch checkpoint flags to activate them. Falling or touching a pink glitch returns Mario to the last checkpoint, retaining score and app collectibles but resetting the current combo. Collect items within 2.5 seconds of one another to increase the multiplier up to ×8; upper-route items with golden rings award double points. Reach the final Copilot beacon to show results. Restart and Explore again reset the run. Progress is in memory only and is lost on reload.

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
- **Recovery:** activate a later checkpoint, fall, and touch a glitch. Expect respawn at the activated checkpoint, retained items/score, and a reset combo. Previously collected items must not award points again.
- **Pause and focus:** use Escape, Pause, Resume, switch tabs, and move focus away from the canvas. Verify simulation pauses, Resume restores keyboard play, and movement is not stuck after returning. Check mouse interactions with the header controls specifically because canvas blur also pauses the game.
- **Completion:** traverse the entire main route to the final beacon. Confirm results match the HUD and Explore again resets the run. Full-level reachability and difficulty need actual play-testing.
- **Audio activation and controls:** verify silence on initial load. Enable music only and play: expect background music without action effects. Enable effects only: expect action sounds without music. Enable both, change each slider, test zero volume, and mute all. Resume after interacting with controls if canvas focus loss paused play. Unavailable audio must not prevent gameplay.
- **Soundtrack quality:** listen through several loops for timing gaps, clicks, distortion, and balance between melody, bass, chords, and percussion. Compare pickup sounds across all four app zones and check jump, boost, respawn, checkpoint, and victory sounds. These sounds have not been auditioned by the assistant.
- **Audio lifecycle:** pause/resume repeatedly, switch tabs, switch windows, and restart several times. Expect silence while paused/hidden and no overlapping soundtrack instances after restart. At completion, expect background music to stop and the enabled victory fanfare to play. Check desktop and real mobile browsers separately; browser audio policies differ.
- **Responsive/touch:** check desktop and narrow layouts, then a real touch device if available. Hold a direction while tapping Jump; release or cancel touches and verify movement stops. Browser device emulation alone does not establish real-device compatibility. The loopback server is accessible only on the computer running it; real-device testing requires a separately configured reachable static host, not an external Microsoft service.
- **Accessibility:** check visible keyboard focus, readable controls, and checkpoint/completion announcements with assistive technology. Enable the OS reduced-motion preference: decorative time-based animation should stop while gameplay movement remains. Canvas gameplay is visual; full nonvisual accessibility is not established.

Do not treat the generated implementation or merged PRs as proof these checks pass. Validate before deployment.

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

</details>
