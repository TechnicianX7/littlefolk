# Littlefolk 2.2.0 · Hearth & Harvest

The village has something to grow toward: five community projects culminate in the Starlight Fair. Food supports village spirit, while the original autonomous residents and real cargo logistics remain.

Play: https://technicianx7.github.io/littlefolk/

## Update without starting over

Export a backup from Settings. Open the same browser or home-screen app while online, then use **Save & refresh** when the update is offered. Settings should show **2.2.0 · Hearth & Harvest**. Do not clear website data or uninstall. Existing villages, routes, goods and residents are retained. The first successful save after migration also preserves the old save in `littlefolk.pre22.save`, separate from the rolling backup. Exported backups remain the safest portable copy.

## Space without friction

New islands have a much larger meadow, with resources mainly around its edges. Existing maps are preserved, not silently bulldozed.

**Land → Clear land → Drag a box:** drag a rectangle, then choose **Clear now** to immediately remove eligible resources and recover half their remaining wood and stone, or **Let folk harvest all** to queue full-yield clearing. Folk now harvest an entire marked patch in a single short work session and carry it home in one trip. Cancel unfinished orders for a selected area or the whole village. A protected few renewable patches keep the economy from running dry.

Use one finger or the mouse to draw an area; two fingers pan/zoom. Brush mode still allows one-finger panning. Every blocked building preview also offers **Clear site now**. Clearing never places or purchases the building; you still confirm its location. Instant clearing is a convenience tradeoff, not a paid currency mechanic.

## Know before you build

Hover a hotbar building with a mouse or focus it with a keyboard for a purpose card. Tap or click it to select it and show its recipe, reason to exist, costs, unlock requirements and relevant suppliers/consumers. Those related-building buttons lead directly to the appropriate build preview. Locked buildings can still be inspected.

New production buildings connect to nearby reachable shared storage automatically by default. The preview has an **Auto-connect storage** checkbox for players who prefer manual routes. Existing customized routes are unchanged. Goods still travel by wagon; nothing teleports. The village board's **How it connects** diagrams show parallel ingredients with a plus sign, not misleading sequential arrows. Windmills supply nearby power, never cargo.

## Food with gentle stakes

Four new buildings make a small supply chain:

- Vegetable patch: 2 vegetables every 14 simulation seconds.
- Cookhouse: 2 vegetables become 3 meals every 10 seconds.
- Berry orchard: 2 berries every 20 seconds.
- Fishing cottage: 2 fish every 22 seconds, within 5 tiles of water.

Food buildings need no wind. With automatic storage connections, the first two buildings are a working food system: vegetables are delivered home, collected by the cookhouse, cooked, then delivered home as meals. Direct producer-to-cookhouse routes are available for more efficient layouts.

At dusk each resident eats one meal. Berries and fish are optional side dishes; one portion serves up to three residents. Only delivered home stock is served. Each new resident brings two welcome meals, and migrated villages get the same introduction. Meals are served once per simulation day. Early manual supper requires enough meals for everyone, avoiding an accidental empty supper; automatic supper shares whatever exists.

Spirit gradually responds to the previous supper. Full meals keep the village cozy, and both side dishes plus gardens help it flourish. Quiet villages have fewer butterflies and subdued flower boxes. Flourishing villages add color, bunting and activity. There is **no starvation, death, eviction, lost progress or hunger-based worker slowdown**. Landmarks you earn are permanent. Nothing decays while the game is closed.

## A purpose for production

Open **Village wishes**. Each project shows material progress, its prerequisite and its visible reward. Pin an available wish to make the next-step card follow that goal. Goods must arrive home before they can be spent.

1. Meadow picnic: 8 planks and 6 meals; picnic blankets and a supper spot.
2. Welcome in bloom: 12 bricks and 8 berries; flowering lantern arch.
3. Wishing fountain: 24 bricks and 8 iron, research chapter 1; a little fountain.
4. Clockwork parade: 12 gears, 12 meals and 6 fish, chapter 2; clockwork ducks and kites.
5. Starlight Fair: 20 gears, 24 planks and 18 meals, chapter 3 and three star letters; festive village decorations and celebratory balloons.

**Set aside supplies for my next wish** is on by default. Home storage holds the materials needed for your next project or research chapter and recommended building; factory routes use the surplus. This prevents downstream workshops from eating every plank you need to progress. The reserved goods remain spendable, and you can switch this budgeting off on the village board. Early guidance also encourages three residents and additional windmills when power is stretched.

Projects never expire and do not reset on a quiet day. Research still unlocks factories; village projects give their output a tangible purpose. All five projects completed means the village's main aspiration is achieved, not that the game ends. Continue redesigning and maintaining your living village.

## Color and controls

There are additional blossom and amber tree variants, varied roof colors, four selectable village palettes, new food-building artwork, flower boxes, butterflies and milestone decorations. **1×, 2×, 3× and 5×** speeds are available. Runtime catch-up remains bounded for responsiveness, so 5× is a target rather than a guarantee under heavy device load. Reduced-motion mode remains supported.

## Tests and known scope

`npm test` covers the village, factories, clearing, full-bundle conservation, food delivery, once-daily meals, mood recovery without speed penalties, project costs/gates, migration and malformed saves, plus a simulated hour with repeated restores. Browser suites cover touch and mouse input, hover guides, area selection, automatic food cargo, project purchases, 5×, old-save migration, panel bounds and offline caching in Chromium and WebKit.

Automated browser emulation is not testing on a physical iPad. Saves remain local, without cloud sync. The village intentionally rests when a book or Settings is open and when the app is hidden or closed. No paid APIs, model calls, trackers or external art assets are used.
