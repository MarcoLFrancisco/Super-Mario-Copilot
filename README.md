# Copilot Cloud Quest

An original browser platformer inspired by Copilot and Microsoft productivity apps. Explore Excel terraces, Outlook mailways, Teams skybridges, and the Copilot beacon. Graphics are drawn procedurally using Canvas; app motifs are illustrative, not official Microsoft icon assets. This project is not affiliated with Microsoft or Nintendo.

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

If Start remains disabled or the page is blank, inspect the browser developer console and Network panel. Confirm `styles.css` and all four `src/*.js` modules load successfully from the repository root, then reload. No `npm install`, `npm run dev`, or `npm test` command is defined by this repository.

## Controls and game rules

| Action | Input |
| --- | --- |
| Move | Left/Right arrows or A/D |
| Jump | Space, W, or Up arrow; release and press again for another jump |
| Copilot boost | Shift; boosts in the facing direction with a 1.5-second cooldown |
| Pause/resume | Escape or the Pause/Resume controls |
| Touch movement | Hold the on-screen left/right buttons |
| Touch actions | Press Jump or Boost |
| Optional audio | Sound button; starts off and requires user activation |

Movement keys work while the game canvas has focus. Losing canvas/window focus or hiding the browser tab pauses play. Resume to refocus the canvas. Touch controls appear on narrow screens or devices reporting a coarse pointer.

Platforms are one-way: jump through their undersides and land on top. Touch checkpoint beacons to activate them. Falling or touching a pink glitch returns you to your last checkpoint, retaining score and collected sparks but resetting the current combo. Collect sparks within 2.5 seconds of one another to increase the multiplier up to ×8; upper-route sparks award double points. Reach the final beacon to show results. Restart and Explore again reset the run. Progress is in memory only and is lost on reload.

## Local manual validation

There are **no automated tests and no test command**. The following are expected results to verify, not recorded passes. Run these checks in the browser launched above and record the browser/version, viewport, failures, and console errors.

- **Startup:** styling and scenery appear, Start becomes enabled, and no application-loading errors appear in the console. Pause and completion overlays are hidden initially.
- **Movement:** start, move both directions, and release each key. The explorer should stop rather than continue moving. Jump onto and through platforms; test edges and optional upper routes.
- **Boost:** press Shift while facing each direction. Movement should burst forward, the HUD should count down, and another boost should become available afterward.
- **Scoring:** collect sparks and confirm each disappears once, increases the count and score, and builds a combo when collected quickly. Wait longer than 2.5 seconds of active play and expect ×1.
- **Recovery:** activate a later checkpoint, fall, and touch a glitch. Expect respawn at the activated checkpoint, retained sparks/score, and a reset combo. Previously collected sparks must not award points again.
- **Pause and focus:** use Escape, Pause, Resume, switch tabs, and move focus away from the canvas. Verify simulation pauses, Resume restores keyboard play, and movement is not stuck after returning. Check mouse interactions with the header controls specifically because canvas blur also pauses the game.
- **Completion:** traverse the entire main route to the final beacon. Confirm results match the HUD and Explore again resets the run. Full-level reachability and difficulty need actual play-testing.
- **Audio:** enable sound with the button and resume if focus loss paused play. Expect short action tones; disable sound and expect silence. Unavailable audio must not prevent gameplay.
- **Responsive/touch:** check desktop and narrow layouts, then a real touch device if available. Hold a direction while tapping Jump; release or cancel touches and verify movement stops. Browser device emulation alone does not establish real-device compatibility. The loopback server is accessible only on the computer running it; real-device testing requires a separately configured reachable static host, not an external Microsoft service.
- **Accessibility:** check visible keyboard focus, readable controls, and checkpoint/completion announcements with assistive technology. Enable the OS reduced-motion preference: decorative time-based animation should stop while gameplay movement remains. Canvas gameplay is visual; full nonvisual accessibility is not established.

Do not treat the generated implementation or merged PRs as proof these checks pass. Validate before deployment.

## File map and shared interfaces

- `index.html`: game shell, HUD, menus, instructions, and canvas.
- `styles.css`: responsive interface, overlays, focus styling, and touch controls.
- `src/level.js`: immutable world data, app palette, viewport, and physics constants.
- `src/art.js`: procedural renderer; `render(context, state, reducedMotion)` reads simulation state without changing it.
- `src/engine.js`: `createState()`, `setPaused(state, paused)`, and `update(state, input, dt)`; updates use seconds and return gameplay events.
- `src/main.js`: DOM integration, input, animation loop, optional audio, and UI updates.

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
