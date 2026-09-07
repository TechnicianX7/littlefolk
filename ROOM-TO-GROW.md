# Littlefolk 2.1.0 · Room to Grow

An intuition and quality-of-life update. The woodland factory, autonomous folk, lantern gatherings, cargo wagons and star-post office remain. This pass makes them easier to understand and gives you control over your village layout.

Play: https://technicianx7.github.io/littlefolk/

## Update your existing village

Use **Settings → Export save** for a backup, reopen or reload while online, then **Save & refresh** when the new update appears. The footer should read **Littlefolk 2.1.0 · Room to Grow**. Continue in the same browser or installed home-screen app. Do not clear website data or uninstall to update.

Version 2.1 keeps the version 2 save schema and storage keys. Existing people, buildings, factory buffers, cargo routes, goods and memories carry forward. Version 1 imports are still supported. Clearing marks are additive save metadata. Cleared tiles and planted saplings persist after reload.

## Build by seeing, not guessing

Choose a building, then tap its proposed location. The map shows a ghost preview. Adjust by tapping another site or using the four nudge arrows. **Build here** confirms; selecting or previewing does not spend materials. The panel shows full material names, costs, missing amounts and placement problems. Paths still place immediately, one tile per tap.

A blocked preview offers **Clear this site first**. That marks the footprint as clearing jobs for your folk. They harvest the obstacles and leave empty land. Keep the preview open or return later. Construction still needs your confirmation and enough materials; it does not secretly spend resources when clearing finishes.

Tap an existing building and use **Move building**. Preview and confirm the new site. Moving is free and preserves the building's identity, residents, rooms, factory inputs, active batches and cargo-route identities. Walking routes recalculate. Invalid destinations do not change the building or spend materials. Homes can move without evicting anyone.

## Make room in the woodland

Open **Land** in the bottom toolbar:

- **Clear land:** tap with a one-tile, 3 × 3 or 5 × 5 brush. Highlighted trees and rocks become high-priority jobs. Folk collect their real materials, then remove the roots or exhausted deposit permanently. Empty stumps can be cleared too. Drag still pans the map rather than painting accidentally.
- **Unmark:** cancel unfinished jobs. **Undo unfinished marks** reverses the latest mark operation. Completed clearing is not reversed and resources are not duplicated.
- **Plant:** tap empty grass to spend two wood on a sapling. It matures into a renewable tree. Plants cannot block the village's essential walking access.
- **Lift path:** remove a footpath and recover its one stone, once.

Tapping a tree or stone directly also gives a single-resource clearing action. Unmarked resources retain their original replenishing behavior.

The village protects a small seed stock of renewable resources, its last currently reachable source of each type, and the last nearby source for existing extractors. This prevents a clearing brush from accidentally destroying the whole economy. Clearing starts after the first resident has a home. Large requests are bounded to keep touch input responsive.

## Understand your workshops at a glance

Inspect a factory to see its ingredients, a downward arrow, and its finished output. **Supplies here** and **Ready to ship** distinguish workshop buffers from spendable home stock. The status describes missing supplies, wind, output routes or protected reserves. Missing wind offers a direct **Place a nearby windmill** action.

**Connect storage** creates the appropriate one-way input and return routes to a nearby reachable hut or stockpile. Wagons still physically carry everything. It does not teleport goods, duplicate an existing route, or remove your custom routes. Factories producing raw goods need only the return route; the star-post office does not ship its letters to storage.

Manual **Send goods…**, pause, route management and reclaim controls remain under **More options**. Valid manual destinations are highlighted. The workshop book has three short visual setup steps with action buttons. Reserves and stock targets use explicit number fields rather than unexplained cycling buttons.

## A quieter interface

One contextual rail holds the current goal, building preview, inspector, cargo-link prompt or land tool. Its height is measured against the actual header and build dock. Long panels scroll within that space. Opening a book or Settings hides the contextual rail.

Crafted goods appear in a compact top ribbon. Notices share a separate status strip instead of covering build controls. Dialog actions report feedback inside their own dialog. Thought bubbles are suppressed during construction or inspection, and memory-book entries no longer interrupt building with automatic story notifications.

A short next-step card offers direct actions such as placing a windmill, inspecting an unconnected workshop or opening the next research chapter. It is guidance, not a mandatory objective. You can clear land, move buildings and choose your own production layout.

## Testing and limits

The simulation regression suite includes clearing yields, depleted stumps, canceled marks, resource protections, planting, path refunds, read-only movement previews, preserved home identities, factory buffers and cargo, and idempotent storage wiring. Existing simulation and legacy-save tests remain.

Browser suites exercise actual touch placement, confirmation, manufacturing, manual and convenience routes, panel bounds, modal feedback, repeated actions, phone and tablet layouts, persistence, frame recovery and offline caching in Chromium and WebKit. Automated browser emulation is not a physical-iPad test.

The village still rests while a book or Settings is open or the app is closed. Close the book to resume. This release does not add background progression. Local saves are not cloud backups.

New runtime files are `qol-ui.js` and `qol.css`. Scripts under `tools/room_*.py` are one-time development integrations, not player setup steps. The finished game is still a standalone static PWA with no paid APIs or runtime model calls.
