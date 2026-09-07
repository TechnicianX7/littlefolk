# Littlefolk

**A small world, all its own.** A cozy, autonomous pixel-art village built for touchscreens, Safari, and iPad home screens.

Play after the Pages deployment completes: **https://TechnicianX7.github.io/littlefolk/**

## Your first little life

Choose the free wooden hut, then tap an empty patch of grass near the central lantern. Pip moves in, finds trees and stones, gathers materials, and carries them home. You choose buildings and the shape of the settlement; your residents choose their work.

The first version includes:

- A seeded island with pixel-art trees, stones, water, flowers, huts, and colored littlefolk with eyes, names, and small accessories.
- Autonomous resource balancing, pathfinding, visible carried bundles, replenishing resources, and shared storage.
- Wooden huts, footpaths, stockpiles, woodcutter cabins, stone sheds, wildflower gardens, and a tool workshop.
- Additional rooms for huts and shared tool upgrades. Up to 24 littlefolk can live on an island.
- Morning, afternoon, golden hour, moonlight, optional soft sounds, and a reduced-motion setting.
- Touch placement, drag-to-pan, pinch zoom, camera buttons, pause, and 1× / 2× / 3× simulation speeds.
- Automatic local saving, a previous-save backup, JSON save export/import, and an offline app cache.

### Lantern time

At dusk, the littlefolk come home to the gathering lantern. Fireflies appear, everyone takes a break, and a few residents share little stories. The memory book keeps the latest 60 moments, including arrivals and the first resource brought home. Stories combine actual work totals with authored, whimsical observations; no AI service is called.

You can also ring the bell yourself. Workers keep anything they were carrying and resume work afterward. No materials are lost during a gathering.

## iPad home-screen installation

1. Open the published game in **Safari**.
2. Use **Share → Add to Home Screen**.
3. Enable **Open as Web App** when that option is shown, then add it.
4. Open the new icon and allow the first online load to complete. The bottom hint reports **Offline ready** when the cache is prepared.

No App Store, signing, sideloading, server account, or ChatGPT Work session is needed to play.

**Important:** Safari and a home-screen web app may use separate storage. To move an existing village, export its save from Settings and import it in the other app. Installing before starting a serious village is the simplest approach.

## Controls and progression

Tap a building card, then tap empty grass to build. Paths remain selected for repeated placement; other buildings return to viewing mode after construction. Buildings need clear walking space. Trees and stones occupy their tiles, even while replenishing. Construction that would cut off existing buildings, residents, or all resources is rejected.

Tap a littlefolk to inspect their name, current thought, and delivered materials. Tap a hut to add a room, or a workshop to improve everyone's tools. Unlocks use all-time delivered materials, not the current inventory, so spending resources never reverses an unlock. Woodcutters and stone sheds improve nearby gathering within seven tiles. Stockpiles provide closer drop-off points. Paths speed up workers walking on those tiles.

Keyboard support: arrow keys pan, + / - zoom, Space pauses when the map is focused, and Escape closes details or cancels building. Buttons remain accessible through Tab.

## Saving and privacy

The village is stored locally in this browser or installed web app. Automatic saving runs every ten seconds during play and on page hiding. A previous successful save is retained as a backup. Imports are validated before replacing the current world; replacement requires confirmation.

Use **Settings → Export save** for a portable backup. Clearing website data or uninstalling the home-screen app can remove local saves. Neither the main save nor its local backup is cloud storage. Saves do not sync between devices.

The village pauses while the page is hidden, a dialog is open, or the app is closed. There is no background simulation, offline resource catch-up, hunger, or absence penalty in version 1. Buildings cannot yet be demolished or moved.

The game has no accounts, trackers, advertising, external fonts, external art assets, paid APIs, or runtime package dependencies. Hosting still makes normal requests to GitHub Pages. The source and hosted app are public; player saves are not uploaded.

## Development

The app is plain HTML, CSS, and JavaScript using Canvas 2D. All pixel art is drawn in code. No compilation or framework is required.

- `index.html`: responsive interface, styling, dialogs, and app metadata.
- `world.js`: browser-independent simulation, construction, pathfinding, progression, and validated saves.
- `app.js`: rendering, touch controls, interface, audio, saving, and service-worker registration.
- `sw.js`: versioned complete-release offline cache with explicit update activation.
- `manifest.webmanifest` and `icon.svg`: home-screen metadata and original icon.
- `tests/world.test.mjs`: simulation regression tests.
- `tests/browser.mjs`: Chromium and WebKit tablet/browser tests and screenshots.

Serve locally using an HTTP server, for example `python3 -m http.server 8000`, then open `http://localhost:8000`. Loading ES modules directly with a `file://` URL is not supported.

Run simulation tests with Node.js:

```sh
npm test
npm run check
```

Optional browser checks:

```sh
npm install --no-save --ignore-scripts playwright
npx playwright install --with-deps chromium webkit
npm run test:browser
```

GitHub Actions runs the checks and retains source, reports, and screenshots as a seven-day artifact. Browser automation emulates tablet input and viewport sizes; it is not a substitute for testing on physical iPads.

## Publishing updates

GitHub Pages serves `main` from the repository root. Keep asset paths relative so the project works below `/littlefolk/`. Bump the cache version in `sw.js` for every published app change. The old version stays active until the player uses **Settings → Save & refresh**, which activates the waiting service worker after saving.
