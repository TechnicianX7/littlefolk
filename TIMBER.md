# Littlefolk 2.0.0 · Timber & Tinkering

The woodland factory update. The littlefolk still decide their own work, take their lantern-time breaks, and keep a village memory book. You now design supply chains around their village.

Play: https://technicianx7.github.io/littlefolk/

## Updating an existing village

1. In the existing browser or installed app, use **Settings → Export save** for a portable backup.
2. Open or reload the app while online so it can discover the new release. In Settings, use **Save & refresh** when the new-version message appears. It saves before activating the waiting update.
3. The Settings footer should read **Littlefolk 2.0.0 · Timber & Tinkering**.

Version 2 imports the version 1 village, residents, inventories, upgrades, map, and memories. It writes to separate version 2 storage keys and leaves the original version 1 save and backup untouched. Continue using the same browser or home-screen app: storage does not automatically sync between them. Export/import can transfer a village.

**Do not clear website data or uninstall the app to update it.** Local saves are not cloud backups. Migration and malformed-save rejection have regression tests, but keep an exported backup of a village you care about.

## Your first factory

After your folk have delivered 28 raw materials in total, open **Craft** below the map.

1. Build a **windmill** and a **sawmill** within its nine-tile radius.
2. Tap a **hut or stockpile**, choose **Connect output**, and tap the sawmill. This is its wood input route.
3. Tap the **sawmill**, choose **Connect output**, and tap the hut or stockpile. This brings finished planks home.
4. Build a **brick cottage** once 40 raw materials have been delivered. Make a stone input route from shared storage, then a return route for bricks.
5. Bring home **12 planks + 8 bricks**. Open **Workshop book → Research** to unlock mines, kilns, and smelters.

The Workshop book includes this guide, live goods accounting, research chapters, reserve controls, stock targets, and cargo-route management. Reading a book or opening Settings pauses the village intentionally; close it to resume.

## Ten new buildings

| Building | Recipe at full power | Unlock |
| --- | --- | --- |
| Meadow windmill | Supplies 8 renewable power within 9 tiles | 28 lifetime raw materials delivered |
| Little sawmill | 2 wood → 1 plank in 5 seconds | 28 delivered |
| Brick cottage | 3 stone → 2 bricks in 6 seconds | 40 delivered |
| Charcoal kiln | 3 wood → 2 charcoal in 8 seconds | Chapter 1 |
| Pebble mine | 2 ore in 7 seconds; needs a stone deposit within 7 tiles | Chapter 1 |
| Hearth smelter | 2 ore + 1 charcoal → 2 iron in 8 seconds | Chapter 1 |
| Clockwork cottage | 2 iron + 1 plank → 1 gear in 9 seconds | Chapter 2 |
| Clockwork grove | 3 wood in 9 seconds; needs a tree within 7 tiles | Chapter 3 |
| Pebble polisher | 3 stone in 10 seconds; needs a stone deposit within 7 tiles | Chapter 3 |
| Star-post office | 2 planks + 1 gear → 1 star letter in 16 seconds | Chapter 3 |

These join all seven original building types. Construction also costs raw and, for later buildings, refined materials. Refined building costs are taken only from shared storage, not workshop buffers.

## Goods really travel

Routes are **one-way**, with visible wooden cargo wagons. Workshops have their own finite input and output buffers. Goods are removed from the source when a wagon leaves and credited to the destination only on arrival. A production chain cannot consume imaginary inputs.

Huts and stockpiles continue sharing the original village inventory. Connect directly between factories to avoid a trip through shared storage. One source can supply several destinations: dispatch uses a round-robin order so the first connected consumer cannot monopolize every output batch. Routes can cross.

Shorter trips, footpaths, additional workshops, and wagon upgrades increase throughput. Footpaths speed wagons by 65 percent while they traverse those tiles. One basic route uses one wagon carrying up to three items. Research enables upgrades to two six-item wagons and then three nine-item wagons per route, with faster movement. The island supports up to 64 routes.

Pause, remove, or filter routes in **Workshop book → Cargo routes**. Removing a route returns any in-flight goods to shared storage exactly once. There are no tile-by-tile conveyor belts in this release; the transport system uses automatically routed cargo wagons.

## Gentle automation, meaningful bottlenecks

A windmill shares its power among nearby non-paused factories. More demand than supply slows production rather than causing damage. Overlapping windmills add capacity. The blue circle shows a selected or previewed windmill's reach.

Workshops display what they need: missing ingredients, wind power, an output route, or room below the stock target. Production progress, power percentage, buffered goods, and completed batches are visible in the inspector. Inputs are paid when a batch begins and survive saving/loading.

The village protects **12 wood and 8 stone** in shared inventory by default, so factory routes do not consume every stick needed for homes. Change these reserves under **Goods & flow**. Stock targets stop new manufacturing batches once enough of that product exists across shared stock, buffers, and transport. Already-running batches may finish.

The flow table shows spendable home stock, outputs waiting at workshops, cargo in transit, and actual factory production/consumption over the last 60 simulation seconds. Villagers' raw gathering is not counted as factory production in those rate columns.

Reclaim non-residential buildings to redesign the village. Half the construction materials return, along with all buffered, in-flight, and in-process ingredients associated with that building. Homes cannot be reclaimed; nobody is evicted. Building movement and path removal are not implemented.

## Three research chapters

- **Warm little hearths:** 12 planks + 8 bricks. Unlocks kilns, mines, and smelters.
- **Clever little clockworks:** 12 iron + 16 planks. Unlocks gear production and the first wagon upgrade.
- **Letters to the stars:** 12 gears + 20 bricks + 24 planks. Unlocks automated raw-material buildings, the largest wagons, and the star-post office.

Research spends only goods that have arrived in shared storage. A full factory output buffer still needs a route home.

## The sky has a mailbox

The star-post office turns a real supply chain into glowing little letters. Give it planks, gears, and wind power. Each finished letter lifts from the office as a paper lantern, increments the village's star-mail count, and adds an authored postcard to the memory book, attributed to a resident.

At the original lantern gathering, villagers still tell their stories. Workshops and wagons soften to one-fifth speed while the littlefolk take their break. There is still no starvation, combat, pollution punishment, or absence penalty.

## Stability work

The previous animation callback could exit after an exception before scheduling its next frame, permanently stopping animation. Version 2 schedules the next callback first and offers **Resume village** after a frame fault. This recovery clears transient selection and movement state without reloading the page.

Pointer-capture calls are guarded, and interrupted gestures reset on capture loss, focus changes, page restoration, and visibility changes. Unrelated interface/promise errors are recorded instead of automatically pausing the whole world. Recent diagnostics are bounded and can be exported from Settings.

Walkability uses a cached occupancy grid. Building-preview validation is cached instead of running full construction checks every frame. Simulation catch-up is bounded to avoid a long stalled frame, and canvas backing sizes change only when dimensions change. Laying paths no longer resets every villager's current job.

These address concrete failure and responsiveness problems found in the code. Browser-emulated tablets are not physical iPads; the exact user's original freeze has not been reproduced on their hardware.

## Tests and development

Run `npm run check` for syntax and `npm test` for the 28 simulation regression tests. The tests include resource conservation, input reservations, backpressure, shared power, research costs, legacy-save migration, invalid saves, safe reclaim, star-post deliveries, and a 30-minute simulated multi-stage village run.

With Playwright and its Chromium/WebKit browsers installed, run:

```sh
node tests/browser.mjs
node tests/timber.browser.mjs
```

The first suite covers the original village and service-worker offline behavior. The second covers repeated touch interactions after 30 simulated minutes, real touch-based route creation, manufacturing, research, recoverable pointer-capture errors, same-page frame recovery, cargo persistence, legacy local-storage migration, and portrait/phone layouts. Tests retain screenshots and JSON results as GitHub Actions artifacts.

New modules are `industry.js` (simulation), `industry-ui.js` (sprites and controls), and `industry.css` (responsive workshop interface). The original `world.js` and `app.js` integrate them. `tools/upgrade_v2.py` is a one-time, exact-anchor development migration from the original source revision, not a runtime script or user installation step.

The game remains a standalone static PWA. No API keys, paid model calls, account login, backend, external art, external fonts, or runtime package dependencies are required. Playing consumes no ChatGPT requests. The game rests while closed; this release does not simulate background or absence catch-up.
