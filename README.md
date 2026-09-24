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

Finch identity system

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
