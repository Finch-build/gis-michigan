# MI·WATER — Michigan water mission control

Single-page map console for Michigan water data. Open `index.html` — no build, no npm, no keys.
(Or `python -m http.server` in this folder if you prefer a server.)

Two files: `index.html` (shell + CSS), `app.js` (catalog + map + live feeds).

## What it shows

**Live (auto-refresh 5 min)** — NOAA/NWS NWPS river gauges in Michigan: current stage/flow,
flood category, flood thresholds, 30-day hydrograph + forecast, historic crests, and 1-year
USGS daily discharge per gauge. Header pills count gauges by flood severity and filter map + list.

**21 GIS layers** pulled live from Michigan Open Data ArcGIS REST services:

| Group | Layers |
|---|---|
| Hydrography | streams & rivers, stream base flow (graduated), river valley segments (thermal class), inland lakes, hydrography polygons, lake contours |
| Watersheds | basins, HUC-8, HUC-12, major subbasins |
| Water quality | AUID 2024 impaired streams (EPA category), PFAS surface-water samples, E. coli / phosphorus / PCB / dissolved-oxygen TMDL watersheds, NWI wetlands |
| Infrastructure & habitat | dam inventory (hazard-coded), stream crossing inventory, blue ribbon trout streams, outstanding state resource waters |

Sources: `gisagocss.state.mi.us` (CSS hydro), `gisagoegle.state.mi.us` (EGLE), `services3.arcgis.com/Jdnp1TjADvSDxMAX` (DNR), `api.water.noaa.gov`, `waterservices.usgs.gov`. Basemap: Esri Dark Gray Canvas + World Imagery (no key).

## Brand

Finch identity system, reversed variant (`C:\Users\Tim\Documents\Brand`):

- Ink-on-paper monochrome — `#0A0B0A`→`#1E211F` surfaces, `#F4F4F1` paper, hairline rules at 14% paper.
- JetBrains Mono for labels, nav, numbers and metadata (uppercase, `.14em` tracking); Public Sans 300 for prose.
- Square corners everywhere, no shadows, no gradients, no tinted fills.
- Signal ink only where a value means something: moss / slate / ochre / clay / iris. Base geography is grey,
  the basemap is desaturated to ink, and status reads as a 9px dot plus a paper label — never coloured text.
  Gauges at or above action stage also carry a 2px rule on the row (the brand's alert treatment).
- Finch mark in the header (reversed), typeset name `finch.dev` in the panel footer.

## How it stays fast

- Heavy layers query only the current viewport, with `maxAllowableOffset` set from zoom so the
  server generalises geometry before sending it, plus a `minzoom` gate per layer.
- Paged requests (`resultOffset`) until `exceededTransferLimit` clears or the layer budget is hit;
  the layer row shows `1,000+` in amber when a result is still truncated.
- In-flight requests abort on pan/zoom; moves are debounced 320 ms.

## UX pass (2026-09-23)

Ran 5 persona reviews (retiree/casual phone user, field hydrologist, lake/stream hobbyist,
environmental advocate, local historian) against the live app, then implemented the asks that
recurred across personas and were small enough to fit the session:

- **Find a place** — search box over the map (`find a lake, river, dam, stream…`) queries the
  named layers (lakes, streams, thermal segments, dams, trout streams, OSRW, crossings, basins)
  by title field and flies to the match. Answers "where's my lake" without knowing it's already
  loaded on screen.
- **Plain-language popups** — every GIS field label (`HUC_8`, `EPAIRCategory`, `DownstreamHazardPotential`,
  `TotalMaxiumumDailyLoadName`, …) is translated to a reader-friendly label (`LABELS` map in
  `app.js`), plus a one-line `blurb` per layer explaining what it is in plain English, and a
  decoded EPA impairment category value.
- **Dam staleness warning** — a high/significant-hazard dam not inspected in 5+ years gets a
  flagged warning line in its popup (`damWarning()`); this was the recurring ask from the
  activist and historian personas ("which dams need a second look").
- **Shareable feature links** — clicking any GIS feature or gauge now writes it into the URL hash
  (`#zoom/lat/lng/layers/l:defid:objectid` or `.../g:lid`); opening that link flies to and reopens
  the same popup. Every popup and the gauge detail panel got a **copy link** button.
- **Coordinates in every popup** and in the gauge detail panel, for field use.
- **Retry on failed layers** — a layer that errors shows a clickable `retry` badge instead of a
  dead `err` label.
- **Bigger mobile tap targets** — layer rows, gauge rows, and header pills got more vertical
  padding under 900px, closer to the 44px touch-target guideline.
- **Gauges on/off is a real toggle** — the map `gauges` button now also stops the 5-min polling
  (not just hiding the dots), and resumes/refetches immediately when turned back on.
- **Live pulse** — the header status dot breathes gently while data is fresh (stops on `stale`);
  the map's alert-ring (gauges at action stage or above) gets a slow, subtle stroke-opacity pulse.
  Deliberately did *not* animate all ~200 gauge dots continuously — this brand is built on
  restraint (no glow/motion), and constant map-wide motion reads as noise, not "live." Tying the
  pulse to the alert ring keeps it meaningful: it pulses because something needs a look, and the
  breathing is slow/low-amplitude enough to read as ambient rather than distracting.
- **Trend arrows** (▲/▼/●) on both the gauge list and gauge detail, computed by diffing each
  gauge's reading against its previous 5-min poll — no extra API calls. This was the actual gap
  when I thought through "what does someone watching live gauge status want": current value and
  flood category were already there, but not whether it's getting better or worse, which is
  usually the first question. Trend is rendered in neutral ink, not color — direction alone isn't
  good or bad without context (a rising level during drought season is fine), so color stays
  reserved for flood category as the brand already does.

Deliberately skipped (bigger than the remaining session budget, or genuinely YAGNI for a
public data console — revisit if a persona keeps asking):

- **Offline/cached last-known state** (field researcher ask) — every layer is a live fetch; add a
  `localStorage` cache of the last successful response per layer if field use on dead signal
  becomes a real workflow, not just a nice-to-have.
- **CSV/GeoJSON export** (field researcher + activist ask) — popups/lists render to DOM only.
  Add a "download visible features as GeoJSON" button per layer if someone actually needs to pull
  data out rather than just link to it (shareable links now cover most of the "show someone a
  specific site" need).
- **Cross-layer "worst first" ranked list** (activist ask: top PFOS readings, high-hazard dams,
  in one sortable list) — currently you still have to eyeball the map per layer. Worth building
  only if advocacy use becomes a primary use case; would live as a new right-panel mode.
- **Favorites / saved locations** (hobbyist ask) — no persistence across sessions beyond the URL
  hash today. `localStorage`-backed favorites list is a small add if "I check the same 3 lakes
  every weekend" turns out to be common.
- **Sample recency indicators** on water-quality layers (PFAS/TMDL sample dates front-and-center)
  — the data's there in the popup (`sample date`) but not surfaced at the map/legend level.

## Notes

- Map state is in the URL hash (`#zoom/lat/lng/layer,ids/selection`) — shareable and reloadable,
  now including the last-opened gauge or GIS feature.
- Mobile: layers and live gauges become full-height sheets behind a three-button tab bar; zero-count status
  pills collapse; the map key hides behind the `key` button.
- `index.html?selftest` runs assertions (query building, flood-category ranking, chart, hash
  parsing, find-layer config) in the console.
- ~100 of the ~200 MI gauges report no current observation; they show as grey "NO DATA".
- Skipped: server-side tiling/caching and offline storage. Add when a layer needs statewide
  detail at low zoom (vector tiles) rather than viewport slices.
