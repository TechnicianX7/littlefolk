# Littlefolk 2.3.0 · Village Works

A systems-coherence update: stable building rules, visible delivery infrastructure, deliberate paving, and repaired progression. The food, five community wishes, color palettes, and lantern gatherings stay.

Play: https://technicianx7.github.io/littlefolk/

## Update your existing village

Export a portable backup from Settings. Open the same browser or home-screen app online, then choose **Save & refresh** when offered. Settings should show **2.3.0 · Village Works**. Do not clear website data or reinstall.

The existing version-2 save format and storage keys remain. People, homes, goods, machine batches, and route identities carry forward. The first successful save also preserves the previous save in `littlefolk.pre23.save`. This local copy is not a cloud backup.

## Building rules you can see

The earlier hut-spawn logic could put a resident into an isolated grass pocket on the wrong side of their hut. That resident then caused unrelated building plots to fail the global access check. Residents now spawn on a connected side, and existing stranded positions are repaired without removing residents or their carried goods. People standing on a new plot step aside when construction is confirmed instead of making placement flicker unpredictably.

The footprint preview has three meanings: **green fits; amber needs clearing; red is blocked**. A small grid shows exact occupied tiles. The cyan square is the proposed loading point. Actual access problems highlight the affected building, rather than blaming a distant unnamed person. Construction still protects an entrance to existing buildings and a reachable source of wood and stone.

Spatial fit and affordability are separate: a green plot can still need more materials. The confirmation panel explains costs, unlocks, predicted wind, and nearby storage. A dotted preview shows the prospective automatic storage lane. It is a proposal, not a promise that the whole future network will never change.

Paving no longer makes an otherwise empty plot unbuildable. Building or moving over purchased paving returns those stones once and reroutes deliveries around the new structure.

## A real, visible delivery network

Cargo links lay connected **packed-earth lanes**. Every wagon travels between consistent exterior loading pads using horizontal and vertical segments. Opposing deliveries between a pair of buildings share exactly the same lane. The planner favors shorter trips, fewer bends, existing shared lanes, and faster purchased paving. It avoids buildings, water, and resource tiles.

Road surfaces remain visible while arrows are hidden. Select a workshop to see **blue incoming arrows and gold outgoing arrows**. Its delivery panel names the connected buildings, transported goods, distance, and estimated one-way travel time; tap a connection to inspect the other building. **Lanes** toggles the wider network overlay, with item colors when no building is selected.

These lanes are derived from cargo connections, not a second construction tax. Removing an unused connection removes its unneeded dirt track; purchased paving stays. Moving buildings or changing land recalculates the lanes. Goods already in transit remain accounted for, although their position shifts to the same proportional progress on the replanned route.

Automatic storage connections choose a reachable hub using estimated lane travel time rather than straight-line distance through obstacles. **Workshop book → Cargo routes → Re-plan storage links** can improve automatically created storage connections after adding a closer depot. It preserves manual routes, buffers, and cargo. Old saves did not record which links were automatic, so those existing destinations are conservatively preserved; their lane geometry still updates. Manually reconnect an old storage route to change its destination.

This is a deterministic, route-by-route weighted planner, not a claim of a mathematically global optimum. Routes have no traffic collisions or congestion model. The distances, visible paths, and travel time nevertheless come from the actual transport simulation.

## Paving becomes a layout decision

Choose **Path**, tap its starting tile, then its ending tile. Preview the complete connected walk and its stone cost, then **Lay this paving**. Existing paved tiles are free. Straight clear stretches remain straight, and obstacles get right-angle detours. Plan several stretches to define your preferred layout. Paved tiles speed up both folk and wagons; nearby automatic lanes prefer them when the detour is worthwhile.

**Land → Lift path** removes individual purchased tiles with their original refund. A delivery connection may still need its free dirt lane underneath. Do not confuse removing paving with disconnecting a supply chain.

## Progression and recovery

Stock targets now apply to spare goods, not ingredients already allocated to downstream workshops or supplies protected for building and wishes. This fixes a late-game deadlock where reserved planks could stop the sawmill while gear production still needed a surplus.

Pinning a future wish now guides and budgets its earliest unfinished prerequisite. Guidance distinguishes a product used by another factory from a product that must be delivered home for research or a wish. It notices paused workshops before recommending extra windmills. Connect storage repairs a paused storage loop without duplicating routes.

The cargo book also offers **Restore sensible stock settings**. This restores default reserves and production targets and enables wish budgeting without deleting goods or changing the village. Pausing a workshop or removing its supply route still stops it intentionally; these reversible player choices are not overridden silently.

The progression suite includes four earned fresh-start runs on different island seeds: normal guidance, an early future-project pin, every production target set to one, and clearing all eligible resource patches. Each follows the game's own next-step guidance, repeatedly saves/restores, and must reach all five community projects with three star letters. Another existing end-to-end progression test remains in place.

## Verification and scope

Run `npm run check` and `node --test --test-concurrency=1 tests/*.test.mjs`. The five browser suites are `browser.mjs`, `timber.browser.mjs`, `qol.browser.mjs`, `bloom.browser.mjs`, and `lanes.browser.mjs`, under `tests/`. They cover offline cache, migration, touch recovery, clearing, food, wishes, paving, network rendering, panel bounds, and repeated interactions in Chromium and WebKit. CI retains source, reports, and screenshots.

Automated browser tests are not a physical-iPad playtest and cannot prove that every possible player-made layout is free of bugs. The game remains local-save, offline-capable, and independent of model APIs. It rests while hidden, closed, or in a book or Settings. No background catch-up was added.
