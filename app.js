/* MI·WATER Mission Control — Michigan GIS Open Data + NOAA/NWS live river gauges.
   No build step, no framework. Data pulled straight from public ArcGIS REST + NWPS APIs. */

const HYDRO = 'https://gisagocss.state.mi.us/arcgis/rest/services/OpenData/hydro/MapServer';
const EGLE  = 'https://gisagoegle.state.mi.us/arcgis/rest/services/EGLE';
const DNR   = 'https://services3.arcgis.com/Jdnp1TjADvSDxMAX/arcgis/rest/services';
const AUID  = 'https://utility.arcgis.com/usrsvcs/servers/4c55b9913e834034b30c9390e5bf2f5d/rest/services/EGLE/AUID2024/FeatureServer';
const NWPS  = 'https://api.water.noaa.gov/nwps/v1';
const MI_BBOX = { xmin: -90.6, ymin: 41.6, xmax: -82.1, ymax: 48.4 };
const EMPTY = { type: 'FeatureCollection', features: [] };

/* Finch ink — base data is grey, signal ink only where a value has to mean something. */
const PAPER = '#F4F4F1', INK35 = '#A8AAA7', INK55 = '#6B6E6C', INK80 = '#2E312F';
const MOSS = '#8FAF95', SLATE = '#86A6C2', OCHRE = '#C9A85F', CLAY = '#C98879', IRIS = '#A197C4';

/* ---------------------------------------------------------------- catalog */
const CATALOG = [
  { g: 'HYDROGRAPHY', items: [
    { id: 'streams', name: 'streams & rivers', url: HYDRO + '/2', kind: 'line', color: INK35,
      minzoom: 9, max: 2000, fields: ['OBJECTID', 'NAME', 'FCC'], title: 'NAME', on: true,
      blurb: 'Every mapped stream and river in Michigan.' },
    { id: 'baseflow', name: 'stream base flow', url: HYDRO + '/3', kind: 'line', color: SLATE,
      minzoom: 8, max: 2000, fields: ['OBJECTID', 'BASE_FLOW', 'YIELD', 'ORDER_'], title: 'ORDER_',
      paint: { 'line-color': ['step', ['coalesce', ['get', 'BASE_FLOW'], 0], INK55, 10, SLATE, 150, PAPER],
        'line-width': ['step', ['coalesce', ['get', 'BASE_FLOW'], 0], 0.8, 10, 1.6, 150, 3] },
      legend: [[INK55, '< 10 cfs'], [SLATE, '10–150 cfs'], [PAPER, '> 150 cfs']],
      blurb: 'How much water keeps flowing in dry weather — brighter lines carry more.' },
    { id: 'segs', name: 'valley segments · thermal', url: HYDRO + '/26', kind: 'line', color: SLATE,
      minzoom: 10, max: 2000, fields: ['OBJECTID', 'STREAMNAME', 'TEMP_', 'SIZE', 'QE50', 'HUC'], title: 'STREAMNAME',
      paint: { 'line-color': ['match', ['get', 'TEMP_'], 'Cold', SLATE, 'Cold transitional', MOSS,
        'Warm transitional', OCHRE, 'Warm', CLAY, INK55], 'line-width': 1.8 },
      legend: [[SLATE, 'cold'], [MOSS, 'cold transitional'], [OCHRE, 'warm transitional'], [CLAY, 'warm']],
      blurb: 'Whether a stretch of river stays cold enough for trout — cold-water streams are the rarest.' },
    { id: 'lakes', name: 'inland lakes', url: HYDRO + '/23', kind: 'fill', color: INK35,
      minzoom: 7, max: 2000, fields: ['OBJECTID', 'LAKE_NAME', 'ACRES_GIS', 'LAKE_TYPE', 'COUNTY', 'NEW_KEY'],
      title: 'LAKE_NAME', on: true, blurb: 'Michigan has over 11,000 inland lakes — tap one for its size and county.' },
    { id: 'hydropoly', name: 'hydrography polygons', url: HYDRO + '/17', kind: 'fill', color: INK55,
      minzoom: 10, max: 2000, fields: ['OBJECTID'], blurb: 'Raw outline shapes behind the water layers.' },
    { id: 'contours', name: 'inland lake contours', url: HYDRO + '/4', kind: 'line', color: INK55,
      minzoom: 12, max: 2000, fields: ['OBJECTID', 'DEPTH'], title: 'DEPTH',
      blurb: 'Underwater depth rings, like a topo map but for lake bottoms.' },
  ]},
  { g: 'WATERSHEDS', items: [
    { id: 'basins', name: 'watershed basins · 145', url: HYDRO + '/16', kind: 'fill', color: PAPER,
      statewide: true, max: 500, fields: ['OBJECTID', 'NAME', 'BASIN', 'HUC_8', 'TDA_MI'], title: 'NAME',
      blurb: 'Michigan split into 145 large drainage areas — every drop inside one flows to the same place.' },
    { id: 'huc8', name: 'huc-8 subbasins · 64', url: HYDRO + '/21', kind: 'fill', color: INK35,
      statewide: true, max: 200, fields: ['OBJECTID', 'Name', 'HUC8', 'AreaSqKm'], title: 'Name',
      blurb: 'A mid-size drainage area — the federal "HUC-8" code is just its ID number.' },
    { id: 'huc12', name: 'huc-12 watersheds', url: HYDRO + '/20', kind: 'fill', color: INK55,
      minzoom: 8, max: 2000, fields: ['OBJECTID', 'Name', 'HUC12', 'AreaAcres', 'HUType', 'ToHUC'], title: 'Name',
      blurb: 'The smallest official drainage area — a neighborhood-scale watershed.' },
    { id: 'subbasins', name: 'major watersheds / subbasins', url: HYDRO + '/15', kind: 'fill', color: INK55,
      minzoom: 8, max: 2000, fields: ['OBJECTID', 'BASIN', 'WCOURSE', 'HUC', 'AREA_MI', 'TDA_MI'], title: 'WCOURSE',
      blurb: 'A watershed grouped by its main river.' },
  ]},
  { g: 'WATER QUALITY', items: [
    { id: 'auid', name: 'impaired streams · auid 2024', url: AUID + '/1', kind: 'line', color: CLAY,
      minzoom: 8, max: 2000, title: 'AUID',
      fields: ['OBJECTID', 'AUID', 'LocationDescription', 'EPAIRCategory', 'EPA303dImpairment',
        'TotalBodyContactAttainment', 'ColdWaterFisheryAttainment', 'FishConsumptionAttainment', 'HowsMyWaterwayLink'],
      paint: { 'line-color': ['match', ['get', 'EPAIRCategory'], '5', CLAY, '4A', OCHRE, '4C', OCHRE,
        '2', MOSS, '1', MOSS, INK55], 'line-width': 2 },
      legend: [[MOSS, 'cat 1–2 attaining'], [OCHRE, 'cat 4 tmdl-covered'], [CLAY, 'cat 5 impaired']],
      blurb: 'Streams that failed a state water-quality test — clay-red means still impaired, moss-green means clean.' },
    { id: 'pfas', name: 'pfas surface water samples', url: EGLE + '/PfasOpenData/MapServer/0', kind: 'circle',
      color: OCHRE, statewide: true, max: 4200, title: 'Waterbody',
      fields: ['OBJECTID', 'Waterbody', 'Watershed', 'CollectionDate', 'CAS1763231_PFOS', 'CAS335671_PFOA',
        'Unit', 'LocationCode', 'Description'],
      paint: { 'circle-color': ['case', ['>', ['coalesce', ['get', 'CAS1763231_PFOS'], -1], 11], CLAY,
        ['>', ['coalesce', ['get', 'CAS1763231_PFOS'], -1], 0], OCHRE, INK55] },
      legend: [[INK55, 'non-detect'], [OCHRE, 'pfos detected'], [CLAY, 'pfos > 11 ppt']],
      blurb: '"Forever chemical" (PFAS) test results — clay-red sites are over the state health limit.' },
    { id: 'ecoli', name: 'e. coli tmdl watersheds', url: EGLE + '/TMDLOpenData/MapServer/6', kind: 'fill',
      color: CLAY, statewide: true, max: 200, title: 'TotalMaxiumumDailyLoadName',
      fields: ['OBJECTID', 'TotalMaxiumumDailyLoadName', 'Year', 'Status', 'LinkToTMDLDocument'],
      blurb: 'Watersheds with a state-mandated cleanup plan for E. coli bacteria pollution.' },
    { id: 'phos', name: 'phosphorus tmdl watersheds', url: EGLE + '/TMDLOpenData/MapServer/3', kind: 'fill',
      color: MOSS, statewide: true, max: 200, title: 'TotalMaxiumumDailyLoadName',
      fields: ['OBJECTID', 'TotalMaxiumumDailyLoadName', 'Year', 'Status', 'LinkToTMDLDocument'],
      blurb: 'Watersheds with a cleanup plan for phosphorus — the main cause of algae blooms.' },
    { id: 'pcb', name: 'pcb tmdl watersheds', url: EGLE + '/TMDLOpenData/MapServer/4', kind: 'fill',
      color: IRIS, statewide: true, max: 200, title: 'TotalMaxiumumDailyLoadName',
      fields: ['OBJECTID', 'TotalMaxiumumDailyLoadName', 'Year', 'Status', 'LinkToTMDLDocument'],
      blurb: 'Watersheds with a cleanup plan for legacy industrial PCB contamination.' },
    { id: 'do', name: 'dissolved oxygen tmdl watersheds', url: EGLE + '/TMDLOpenData/MapServer/1', kind: 'fill',
      color: SLATE, statewide: true, max: 200, title: 'TotalMaxiumumDailyLoadName',
      fields: ['OBJECTID', 'TotalMaxiumumDailyLoadName', 'Year', 'Status', 'LinkToTMDLDocument'],
      blurb: 'Watersheds where the water doesn’t hold enough oxygen for fish, with a cleanup plan on file.' },
    { id: 'wetlands', name: 'national wetlands inventory', url: EGLE + '/WrdOpenData/MapServer/9', kind: 'fill',
      color: MOSS, minzoom: 12, max: 2000, fields: ['OBJECTID'],
      blurb: 'Marshes and swamps that filter water and shelter wildlife.' },
  ]},
  { g: 'INFRASTRUCTURE & HABITAT', items: [
    { id: 'dams', name: 'dam inventory · 2,552', url: EGLE + '/DamInventoryOpenData/MapServer/0', kind: 'circle',
      color: CLAY, statewide: true, max: 3000, title: 'DamName', on: true,
      fields: ['OBJECTID', 'DamName', 'River', 'County', 'DownstreamHazardPotential', 'ConditionAssessment',
        'YearCompleted', 'DamType', 'StructuralHeight', 'MaximumStorage', 'OwnerType', 'InspectionDate',
        'EmergencyActionPlan', 'FishPassage', 'Purposes'],
      paint: { 'circle-color': ['match', ['get', 'DownstreamHazardPotential'], 'High', CLAY,
        'Significant', OCHRE, 'Low', INK35, INK55],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.5, 12, 6] },
      legend: [[CLAY, 'high hazard'], [OCHRE, 'significant'], [INK35, 'low / unrated']],
      blurb: 'Every dam in Michigan, color-coded by what could happen downstream if it failed.' },
    { id: 'crossings', name: 'stream crossing inventory', kind: 'circle', color: OCHRE,
      url: DNR + '/Great_Lakes_Stream_Crossing_Inventory_Viewer/FeatureServer/0', minzoom: 8, max: 2000,
      title: 'StreamName', fields: ['OBJECTID', 'StreamName', 'CrossingName', 'county', 'InventoryDate',
        'RoadCondition', 'RoadOvertopping', 'StructureStreamAlignment', 'StreamFlowType'],
      blurb: 'Road/culvert crossings over streams, surveyed for whether fish and water can pass through.' },
    { id: 'trout', name: 'blue ribbon trout streams', url: DNR + '/DNRFisheriesDataOPENDATA/FeatureServer/2',
      kind: 'line', color: MOSS, statewide: true, max: 500, title: 'Name',
      fields: ['OBJECTID', 'Name', 'GNISName', 'UpstreamLimit', 'DownstreamLimit', 'LengthMi', 'UPLP'],
      blurb: 'Michigan’s top-rated trout water, as designated by the DNR.' },
    { id: 'osrw', name: 'outstanding state resource waters', url: EGLE + '/WrdOpenData/MapServer/15',
      kind: 'line', color: IRIS, statewide: true, max: 1000, title: 'OSRWName',
      fields: ['OBJECTID', 'OSRWName', 'OSRWType'],
      blurb: 'Waters given the state’s highest legal protection against new pollution.' },
  ]},
];
const DEFS = CATALOG.flatMap(g => g.items);
const byId = Object.fromEntries(DEFS.map(d => [d.id, d]));
// layers worth text-searching by name — skip the ones with no human-readable title field
const FIND_LAYERS = ['lakes', 'streams', 'segs', 'dams', 'trout', 'osrw', 'crossings', 'basins'];

/* ------------------------------------------------------------- flood cats */
const CATS = [
  ['major',       'major',    IRIS],
  ['moderate',    'moderate', CLAY],
  ['minor',       'minor',    OCHRE],
  ['action',      'action',   SLATE],
  ['no_flooding', 'normal',   MOSS],
  ['offline',     'no data',  INK55],
];
const CATCOLOR = Object.fromEntries(CATS.map(c => [c[0], c[2]]));
const catOf = g => {
  const c = g?.status?.observed?.floodCategory;
  return CATCOLOR[c] ? c : 'offline';
};
const catRank = g => CATS.findIndex(c => c[0] === catOf(g));

/* --------------------------------------------------------- plain-english */
// Field names as they come off the GIS servers are code-speak; translate the common ones.
// null = hide the field entirely (internal IDs with no reader value).
const LABELS = {
  FCC: 'road/stream class', BASE_FLOW: 'base flow (cfs)', YIELD: 'yield', ORDER_: 'stream order',
  STREAMNAME: 'stream', TEMP_: 'water temp class', SIZE: 'stream size', QE50: 'flow (Q50)', HUC: 'watershed code',
  LAKE_NAME: 'lake', ACRES_GIS: 'area (acres)', LAKE_TYPE: 'lake type', COUNTY: 'county', NEW_KEY: null,
  DEPTH: 'depth (ft)', NAME: 'name', BASIN: 'basin', HUC_8: 'watershed code', TDA_MI: 'drainage area (sq mi)',
  HUC8: 'watershed code', AreaSqKm: 'area (sq km)', HUC12: 'watershed code', AreaAcres: 'area (acres)',
  HUType: 'watershed type', ToHUC: 'drains to', WCOURSE: 'stream', AREA_MI: 'area (sq mi)',
  AUID: 'assessment id', LocationDescription: 'location', EPAIRCategory: 'water quality status',
  EPA303dImpairment: 'impairment', TotalBodyContactAttainment: 'safe for swimming',
  ColdWaterFisheryAttainment: 'safe for cold-water fish', FishConsumptionAttainment: 'safe to eat fish',
  HowsMyWaterwayLink: 'state report', Waterbody: 'waterbody', Watershed: 'watershed', CollectionDate: 'sample date',
  CAS1763231_PFOS: 'PFOS (ppt)', CAS335671_PFOA: 'PFOA (ppt)', Unit: 'unit', LocationCode: 'site code',
  Description: 'notes', TotalMaxiumumDailyLoadName: 'cleanup plan', Year: 'plan year', Status: 'status',
  LinkToTMDLDocument: 'full plan', DamName: 'dam', River: 'river', DownstreamHazardPotential: 'hazard if it failed',
  ConditionAssessment: 'condition', YearCompleted: 'built', DamType: 'type', StructuralHeight: 'height (ft)',
  MaximumStorage: 'max storage (acre-ft)', OwnerType: 'owner', InspectionDate: 'last inspected',
  EmergencyActionPlan: 'emergency plan on file', FishPassage: 'fish passage', Purposes: 'purpose',
  StreamName: 'stream', CrossingName: 'crossing', county: 'county', RoadCondition: 'road condition',
  RoadOvertopping: 'road floods over crossing', StructureStreamAlignment: 'aligned with stream',
  StreamFlowType: 'flow type', GNISName: 'also known as', UpstreamLimit: 'upstream end',
  DownstreamLimit: 'downstream end', LengthMi: 'length (mi)', UPLP: 'upland protection', OSRWName: 'waterway',
  OSRWType: 'protection type',
};
const EPACAT = { '5': 'impaired — not meeting standards', '4A': 'impaired — cleanup plan approved',
  '4B': 'impaired — alternate plan', '4C': 'impaired — not a pollutant cause',
  '2': 'meeting some standards', '1': 'meeting all standards' };
const VALFMT = { EPAIRCategory: v => EPACAT[v] || v };

/* ------------------------------------------------------------------- util */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const num = v => typeof v === 'number' ? (Math.abs(v) >= 100 ? Math.round(v).toLocaleString()
  : +v.toFixed(2) + '') : v;
const ago = t => {
  if (!t) return '—';
  const m = (Date.now() - new Date(t)) / 6e4;
  if (m < 0) return 'in ' + Math.round(-m) + 'm';
  if (m < 60) return Math.round(m) + 'm ago';
  if (m < 48 * 60) return Math.round(m / 60) + 'h ago';
  return Math.round(m / 1440) + 'd ago';
};

/* --------------------------------------------------------------- map init */
const start = parseHash();
const ESRI = 'https://services.arcgisonline.com/arcgis/rest/services';
const BASEMAPS = {
  dark: [ESRI + '/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
  sat: [ESRI + '/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
};
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      base: { type: 'raster', tiles: BASEMAPS.dark, tileSize: 256, maxzoom: 16,
        attribution: 'Esri · Michigan GIS Open Data · NOAA/NWS · USGS' },
      labels: { type: 'raster', tileSize: 256, maxzoom: 16,
        tiles: [ESRI + '/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'] },
    },
    // basemap held at ink weight — colour on this screen belongs to the data
    layers: [
      { id: 'base', type: 'raster', source: 'base',
        paint: { 'raster-saturation': -1, 'raster-brightness-max': 0.48, 'raster-contrast': -0.05 } },
      { id: 'labels', type: 'raster', source: 'labels',
        paint: { 'raster-opacity': 0.5, 'raster-saturation': -1 } },
    ],
  },
  center: [start.lng, start.lat], zoom: start.zoom, minZoom: 5, maxZoom: 17,
  attributionControl: { compact: true },
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: true }), 'top-right');
map.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-left');

/* ------------------------------------------------------- ArcGIS query core */
const RANK = { fill: 1, line: 2, circle: 3, gauge: 9 };

// degrees-per-pixel at current view — used to generalise geometry server-side.
function simplifyTolerance() {
  return 360 / (512 * Math.pow(2, map.getZoom())) * 1.5;
}

function queryUrl(def, bounds, tol, offset = 0) {
  const p = new URLSearchParams({
    where: def.where || '1=1', outFields: (def.fields || []).join(',') || '*',
    returnGeometry: 'true', f: 'geojson', outSR: '4326', geometryPrecision: '5',
    resultRecordCount: String(def.max || 2000), resultOffset: String(offset),
  });
  if (bounds) {
    p.set('geometry', bounds.join(','));
    p.set('geometryType', 'esriGeometryEnvelope');
    p.set('inSR', '4326');
    p.set('spatialRel', 'esriSpatialRelIntersects');
  }
  if (def.kind !== 'circle' && tol) p.set('maxAllowableOffset', tol.toPrecision(3));
  return def.url + '/query?' + p;
}

function viewBounds() {
  const b = map.getBounds();
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(v => +v.toFixed(3));
}

let busy = 0;
const setBusy = d => { busy = Math.max(0, busy + d); $('#busy').classList.toggle('on', busy > 0); };

// Services cap each response (usually 1000 rows), so page until the server stops
// flagging exceededTransferLimit or we hit the layer's budget.
async function fetchPaged(def, bounds, tol, signal) {
  const budget = def.max || 2000, feats = [];
  let more = false;
  for (let page = 0; page < 8; page++) {
    const r = await fetch(queryUrl(def, bounds, tol, feats.length), { signal });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message || 'service error');
    feats.push(...(j.features || []));
    more = !!(j.exceededTransferLimit || j.properties?.exceededTransferLimit);
    if (!more || !j.features?.length || feats.length >= budget) break;
  }
  return { data: { type: 'FeatureCollection', features: feats }, truncated: more && feats.length >= budget };
}

async function loadLayer(def) {
  if (!def.on || !map.getSource('src-' + def.id)) return;
  const src = map.getSource('src-' + def.id);
  if (!def.statewide && map.getZoom() < (def.minzoom || 0)) {
    def.state = 'zoom'; def.key = null; src.setData(EMPTY); renderLayers(); return;
  }
  const bounds = def.statewide ? null : viewBounds();
  const tol = def.statewide ? 0.002 : simplifyTolerance();
  const key = (bounds || ['all']).join(',') + '|' + tol.toPrecision(3);
  if (def.key === key) return;
  def.key = key;
  def.ctl?.abort();
  const ctl = def.ctl = new AbortController();
  def.state = 'loading'; renderLayers(); setBusy(1);
  try {
    const { data, truncated } = await fetchPaged(def, bounds, tol, ctl.signal);
    src.setData(data);
    def.count = data.features.length;
    def.state = truncated ? 'truncated' : 'ok';
  } catch (e) {
    if (e.name === 'AbortError') return;
    def.state = 'error'; def.key = null; def.count = 0;
    console.warn(def.id, e.message);
  } finally { setBusy(-1); renderLayers(); }
}

function addLayer(def) {
  const sid = 'src-' + def.id;
  if (map.getSource(sid)) return;
  map.addSource(sid, { type: 'geojson', data: EMPTY });
  const rank = RANK[def.kind];
  const before = map.getStyle().layers.find(l => (l.metadata?.rank ?? 0) > rank)?.id;
  const meta = { metadata: { rank, def: def.id } };
  const ids = [];
  if (def.kind === 'fill') {
    map.addLayer({ id: def.id, type: 'fill', source: sid, ...meta,
      paint: { 'fill-color': def.color, 'fill-opacity': 0.08, ...(def.paint || {}) } }, before);
    map.addLayer({ id: def.id + '-o', type: 'line', source: sid, metadata: { rank, def: def.id },
      paint: { 'line-color': def.color, 'line-width': 1, 'line-opacity': 0.8 } }, before);
    ids.push(def.id);
  } else if (def.kind === 'line') {
    map.addLayer({ id: def.id, type: 'line', source: sid, ...meta,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': def.color, 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 14, 2.6],
        ...(def.paint || {}) } }, before);
    ids.push(def.id);
  } else {
    map.addLayer({ id: def.id, type: 'circle', source: sid, ...meta,
      paint: { 'circle-color': def.color, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.5, 13, 6],
        'circle-stroke-color': '#0A0B0A', 'circle-stroke-width': 0.8, ...(def.paint || {}) } }, before);
    ids.push(def.id);
  }
  for (const id of ids) {
    map.on('click', id, e => showPopup(def, e.features[0], e.lngLat));
    map.on('mouseenter', id, () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', id, () => map.getCanvas().style.cursor = '');
  }
}

function removeLayer(def) {
  for (const id of [def.id, def.id + '-o']) if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource('src-' + def.id)) map.removeSource('src-' + def.id);
  def.key = null; def.state = null; def.count = 0;
}

function showPopup(def, f, lngLat) {
  if (!f) return;
  const oid = f.properties.OBJECTID;
  selFeat = oid != null ? { l: def.id, o: oid } : null; writeHash();
  const rows = (def.fields || Object.keys(f.properties))
    .filter(k => k !== 'OBJECTID' && LABELS[k] !== null && f.properties[k] != null && f.properties[k] !== '')
    .map(k => {
      const raw = f.properties[k];
      const v = VALFMT[k] ? VALFMT[k](raw) : raw;
      const val = /^https?:/.test(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener">open ↗</a>` : esc(num(v));
      const label = LABELS[k] !== undefined ? LABELS[k] : k.replace(/_$/, '').replace(/_/g, ' ');
      return `<dt>${esc(label)}</dt><dd>${val}</dd>`;
    }).join('');
  const t = f.properties[def.title] || def.name;
  const warn = damWarning(def, f.properties);
  const coord = `<dt>coordinates</dt><dd>${lngLat.lat.toFixed(5)}, ${lngLat.lng.toFixed(5)}</dd>`;
  const pop = new maplibregl.Popup({ maxWidth: '300px' }).setLngLat(lngLat)
    .setHTML(`<div class="pop"><h3>${esc(t)}</h3>
      ${def.blurb ? `<p class="pop-blurb">${esc(def.blurb)}</p>` : ''}
      ${warn ? `<p class="pop-warn">${esc(warn)}</p>` : ''}
      <dl>${rows}${coord}</dl>
      <div class="src">${esc(def.name)}<button class="copylink">copy link</button></div></div>`).addTo(map);
  pop.getElement().querySelector('.copylink').onclick = e => {
    navigator.clipboard?.writeText(location.href);
    e.target.textContent = 'copied ✓'; setTimeout(() => e.target.textContent = 'copy link', 1200);
  };
  pop.on('close', () => { if (selFeat?.l === def.id && selFeat?.o === oid) { selFeat = null; writeHash(); } });
}

// Surfaces the one fact advocates keep asking for: a high-hazard dam nobody has checked on lately.
function damWarning(def, p) {
  if (def.id !== 'dams') return null;
  const hazard = p.DownstreamHazardPotential;
  if (hazard !== 'High' && hazard !== 'Significant') return null;
  const years = p.InspectionDate ? (Date.now() - new Date(p.InspectionDate)) / (365 * 864e5) : Infinity;
  if (years <= 5) return null;
  const staleness = p.InspectionDate ? `last inspected ${Math.floor(years)}y ago` : 'no inspection on record';
  return `⚠ ${hazard.toLowerCase()} hazard dam, ${staleness}.`;
}

/* -------------------------------------------------------------- layer UI */
function renderLayers() {
  const z = map.getZoom();
  $('#layers').innerHTML = CATALOG.map(g => `<div class="grp">${g.g}</div>` + g.items.map(d => {
    const zoomed = !d.statewide && d.minzoom && z < d.minzoom;
    const badge = !d.on ? '' : d.state === 'loading' ? '···'
      : d.state === 'error' ? '<span class="ct err">retry</span>'
      : zoomed ? `z${d.minzoom}+`
      : d.state === 'truncated' ? `<span class="ct warn">${d.count}+</span>`
      : d.count != null ? d.count.toLocaleString() : '';
    return `<div class="lyr ${d.on ? 'on' : ''} ${zoomed && d.on ? 'zoomed' : ''}" data-id="${d.id}">
      <span class="sw" style="background:${d.color}"></span>
      <span class="nm">${d.name}</span><span class="ct">${badge}</span></div>`;
  }).join('')).join('');
  $('#lyrcount').textContent = DEFS.filter(d => d.on).length + '/' + DEFS.length;
  renderLegend();
}

$('#layers').addEventListener('click', e => {
  const retry = e.target.closest('.ct.err');
  if (retry) { const def = byId[retry.closest('.lyr').dataset.id]; def.key = null; loadLayer(def); return; }
  const el = e.target.closest('.lyr'); if (!el) return;
  const def = byId[el.dataset.id];
  def.on = !def.on;
  if (def.on) { addLayer(def); loadLayer(def); } else { removeLayer(def); }
  renderLayers(); writeHash();
});

const legendRows = rows => rows.map(r =>
  `<div class="row" style="color:${r[0]}"><i></i><span style="color:var(--paper)">${r[1]}</span></div>`).join('');

function renderLegend() {
  const parts = [`<b>gauge status</b>` + legendRows(CATS.map(c => [c[2], c[1]]))];
  for (const d of DEFS) if (d.on && d.legend) parts.push(`<b>${d.name}</b>` + legendRows(d.legend));
  $('#legend').innerHTML = parts.join('');
}

/* ----------------------------------------------------------- live gauges */
let gauges = [], filterCat = null, selected = null, selFeat = null, gaugesOn = true, gaugeTimer, pulseTimer;
const TREND_ARROW = { up: '▲', down: '▼', flat: '●' };
const trendOf = (prev, cur) => (prev == null || cur == null || prev <= -999 || cur <= -999) ? null
  : cur > prev ? 'up' : cur < prev ? 'down' : 'flat';

function firstCoord(geom) {
  let c = geom.coordinates;
  while (Array.isArray(c[0])) c = c[0];
  return c;
}

/* ---------------------------------------------------------- place search */
let findCtl, findT;
async function runFind(q) {
  q = q.trim();
  const box = $('#findResults');
  if (q.length < 2) { box.classList.remove('show'); box.innerHTML = ''; return; }
  findCtl?.abort();
  const ctl = findCtl = new AbortController();
  const targets = FIND_LAYERS.map(id => byId[id]);
  const safe = q.replace(/'/g, "''");
  const results = await Promise.all(targets.map(async d => {
    try {
      const p = new URLSearchParams({ where: `UPPER(${d.title}) LIKE UPPER('%${safe}%')`,
        outFields: `OBJECTID,${d.title}`, returnGeometry: 'true', f: 'geojson', outSR: '4326', resultRecordCount: '4' });
      const j = await (await fetch(`${d.url}/query?${p}`, { signal: ctl.signal })).json();
      return (j.features || []).map(f => ({ def: d, f }));
    } catch { return []; }
  }));
  if (ctl.signal.aborted) return;
  const flat = results.flat().slice(0, 12);
  box.innerHTML = flat.length ? flat.map((r, i) => `<div class="find-row" data-i="${i}">
      <span>${esc(r.f.properties[r.def.title])}</span><span class="g">${esc(r.def.name)}</span></div>`).join('')
    : '<div class="find-row empty">No matches.</div>';
  box.classList.add('show');
  box.querySelectorAll('.find-row[data-i]').forEach(el => el.onclick = () => {
    const r = flat[+el.dataset.i];
    flyToFind(r.def, r.f);
    box.classList.remove('show'); $('#find').value = '';
  });
}
function flyToFind(def, f) {
  const [lng, lat] = firstCoord(f.geometry);
  if (!def.on) { def.on = true; addLayer(def); loadLayer(def); renderLayers(); }
  map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), (def.minzoom || 9) + 1) });
  setTimeout(() => showPopup(def, f, { lng, lat }), 400);
}
$('#find').addEventListener('input', e => { clearTimeout(findT); findT = setTimeout(() => runFind(e.target.value), 300); });
document.addEventListener('click', e => { if (!e.target.closest('.find')) $('#findResults').classList.remove('show'); });

async function loadGauges() {
  // diff against the last poll so the list can show rising/falling without a second fetch per gauge
  const prevVal = new Map(gauges.map(g => [g.lid, g.status?.observed?.primary]));
  try {
    const u = `${NWPS}/gauges?srid=EPSG_4326&bbox.xmin=${MI_BBOX.xmin}&bbox.ymin=${MI_BBOX.ymin}` +
      `&bbox.xmax=${MI_BBOX.xmax}&bbox.ymax=${MI_BBOX.ymax}`;
    setBusy(1);
    const j = await (await fetch(u)).json();
    gauges = (j.gauges || []).filter(g => g.state?.abbreviation === 'MI' && g.latitude && g.longitude);
    gauges.forEach(g => {
      g.trend = trendOf(prevVal.get(g.lid), g.status?.observed?.primary);
    });
    gauges.sort((a, b) => catRank(a) - catRank(b) || a.name.localeCompare(b.name));
    $('#updated').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $('#live').classList.remove('stale');
  } catch (e) {
    console.warn('gauges', e); $('#live').classList.add('stale');
  } finally { setBusy(-1); }
  drawGauges(); renderPills(); renderList();
}

function gaugeGeoJSON() {
  return { type: 'FeatureCollection', features: gauges.map(g => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [g.longitude, g.latitude] },
    properties: { lid: g.lid, name: g.name, cat: catOf(g), rank: catRank(g),
      v: g.status?.observed?.primary ?? null, u: g.status?.observed?.primaryUnit || '' },
  })) };
}

function drawGauges() {
  const data = gaugeGeoJSON();
  if (map.getSource('gauges')) return map.getSource('gauges').setData(data);
  map.addSource('gauges', { type: 'geojson', data });
  const color = ['match', ['get', 'cat'], ...CATS.slice(0, -1).flatMap(c => [c[0], c[2]]), INK55];
  // alert ring = a hairline, not a glow: severity also reads as size (brand rule 09)
  map.addLayer({ id: 'gauge-halo', type: 'circle', source: 'gauges', metadata: { rank: RANK.gauge },
    filter: ['<', ['get', 'rank'], 4],
    paint: { 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': color, 'circle-stroke-width': 1,
      'circle-stroke-opacity': 0.8, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 8, 12, 20] } });
  map.addLayer({ id: 'gauge-pt', type: 'circle', source: 'gauges', metadata: { rank: RANK.gauge },
    paint: { 'circle-color': color, 'circle-stroke-color': '#0A0B0A', 'circle-stroke-width': 1.2,
      'circle-opacity': ['case', ['==', ['get', 'cat'], 'offline'], 0.45, 1],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 5,
        ['case', ['<', ['get', 'rank'], 4], 5, 3.5], 12, ['case', ['<', ['get', 'rank'], 4], 10, 7]] } });
  map.on('click', 'gauge-pt', e => selectGauge(e.features[0].properties.lid, true));
  map.on('mouseenter', 'gauge-pt', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'gauge-pt', () => map.getCanvas().style.cursor = '');
}

function renderPills() {
  const counts = Object.fromEntries(CATS.map(c => [c[0], 0]));
  gauges.forEach(g => counts[catOf(g)]++);
  $('#pills').innerHTML = CATS.map(c => `<div class="pill ${filterCat === c[0] ? 'on' : ''} ${
    counts[c[0]] ? '' : 'zero'}" data-cat="${c[0]}"><i style="color:${c[2]}"></i><b>${counts[c[0]]}</b> ${c[1]}</div>`).join('');
}
$('#pills').addEventListener('click', e => {
  const el = e.target.closest('.pill'); if (!el) return;
  filterCat = filterCat === el.dataset.cat ? null : el.dataset.cat;
  renderPills(); renderList();
  map.setFilter('gauge-pt', filterCat ? ['==', ['get', 'cat'], filterCat] : null);
});

function visibleGauges() {
  const q = $('#search').value.trim().toLowerCase();
  return gauges.filter(g => (!filterCat || catOf(g) === filterCat) &&
    (!q || g.name.toLowerCase().includes(q) || g.lid.toLowerCase().includes(q)));
}

function renderList() {
  const list = visibleGauges();
  $('#gcount').textContent = list.length;
  $('#gauges').innerHTML = list.map(g => {
    const o = g.status?.observed || {}, c = catOf(g);
    return `<div class="gauge ${selected === g.lid ? 'sel' : ''} ${catRank(g) < 4 ? 'alert' : ''}"
      style="color:${CATCOLOR[c]}" data-lid="${g.lid}"><i></i>
      <span class="g1"><div class="nm">${esc(g.name)}</div>
        <div class="sub">${[g.lid, g.county, ago(o.validTime)].filter(Boolean).map(esc).join(' · ')}</div></span>
      <span class="val">${g.trend ? `<span class="trend ${g.trend}">${TREND_ARROW[g.trend]}</span>` : ''}${
        o.primary != null && o.primary > -999 ? num(o.primary) : '—'}
        <small>${esc(o.primaryUnit || '')}</small></span></div>`;
  }).join('') || '<div class="hint">No gauges match.</div>';
}
$('#gauges').addEventListener('click', e => {
  const el = e.target.closest('.gauge'); if (el) selectGauge(el.dataset.lid, false);
});
$('#search').addEventListener('input', renderList);

/* ------------------------------------------------------------ gauge detail */
async function selectGauge(lid, fromMap) {
  selected = lid; selFeat = { l: 'gauge', o: lid }; writeHash(); renderList();
  const g = gauges.find(x => x.lid === lid);
  if (!fromMap && g) map.flyTo({ center: [g.longitude, g.latitude], zoom: Math.max(map.getZoom(), 10) });
  if (innerWidth <= 900) setSheet('live');
  showDetail(g, null, null);
  setBusy(1);
  try {
    const [info, sf] = await Promise.all([
      fetch(`${NWPS}/gauges/${lid}`).then(r => r.json()),
      fetch(`${NWPS}/gauges/${lid}/stageflow`).then(r => r.json()),
    ]);
    if (selected === lid) showDetail(g, info, sf);
  } catch (e) { console.warn('detail', e); } finally { setBusy(-1); }
}

const SERIES = { obs: 'observed', fc: 'forecast' };
let chartMode = '30d';

function showDetail(g, info, sf) {
  const d = $('#detail'), o = (info || g)?.status?.observed || {};
  const cat = catOf(info || g), color = CATCOLOR[cat];
  const fl = info?.flood || {};
  const th = fl.categories || {};
  const crests = (fl.crests?.historic || []).slice(0, 6);
  const usgs = info?.usgsId;
  const obs = (sf?.observed?.data || []).map(p => ({ t: +new Date(p.validTime), v: p.primary }));
  const fc = (sf?.forecast?.data || []).map(p => ({ t: +new Date(p.validTime), v: p.primary }));
  d.classList.add('show'); $('#list').style.display = 'none';
  d.innerHTML = `
  <div class="dhead">
    <button class="back">← all gauges</button>
    <h2>${esc((info || g)?.name || '')}</h2>
    <div class="sub">${esc(g?.lid || '')} · ${esc(info?.county || g?.county || '')} County ·
      NWS ${esc(info?.wfo?.abbreviation || g?.wfo?.abbreviation || '')}</div>
  </div>
  <div class="scroll">
    <div class="big"><span class="v">${o.primary > -999 ? num(o.primary) : '—'}</span>
      ${g?.trend ? `<span class="trend ${g.trend}" style="font-size:16px">${TREND_ARROW[g.trend]}</span>` : ''}
      <span class="u">${esc(o.primaryUnit || 'ft')} stage</span>
      <span class="u" style="margin-left:auto;text-align:right">${o.secondary > -999 ? num(o.secondary) + ' ' + esc(o.secondaryUnit || '') : ''}</span></div>
    <div class="state" style="color:${color}"><i></i><span style="color:var(--paper)">${
      cat.replace(/_/g, ' ')}</span><em>${ago(o.validTime)}${g?.trend ? ' · ' + { up: 'rising', down: 'falling', flat: 'steady' }[g.trend] : ''}</em></div>
    <div class="sect">hydrograph<span class="tabs">
      <button class="tab ${chartMode === '30d' ? 'on' : ''}" data-mode="30d">30d + fcst</button>
      <button class="tab ${chartMode === '1y' ? 'on' : ''}" data-mode="1y" ${usgs ? '' : 'disabled'}>1y flow</button>
    </span></div>
    <div class="chart" id="chart">${chartMode === '30d'
      ? chartSVG(obs, fc, th, sf?.observed?.primaryUnits || 'ft')
      : '<div class="hint">loading USGS daily values…</div>'}</div>
    ${Object.keys(th).length ? `<div class="sect">flood thresholds · ${esc(fl.stageUnits || 'ft')}</div><dl class="kv">` +
      ['major', 'moderate', 'minor', 'action'].filter(k => th[k]?.stage > -999).map(k =>
        `<dt><i style="color:${CATCOLOR[k]}"></i>${k}</dt><dd>${num(th[k].stage)}${
          th[k].flow > 0 ? ` · ${num(th[k].flow)} cfs` : ''}</dd>`).join('') + '</dl>' : ''}
    ${crests.length ? `<div class="sect">historic crests</div><table class="crest">` + crests.map(c =>
      `<tr><td>${num(c.stage)} ${esc(fl.stageUnits || 'ft')}</td>
       <td>${new Date(c.occurredTime).toLocaleDateString()}</td></tr>`).join('') + '</table>' : ''}
    <div class="links">
      <a href="https://water.noaa.gov/gauges/${esc(g?.lid || '')}" target="_blank" rel="noopener">nws gauge page ↗</a>
      ${usgs ? `<a href="https://waterdata.usgs.gov/monitoring-location/${esc(usgs)}/" target="_blank" rel="noopener">usgs ${esc(usgs)} ↗</a>` : ''}
      <button class="copylink" id="gaugeCopy">copy link</button>
    </div>
    ${g ? `<div class="hint" style="border:0">${g.latitude.toFixed(5)}, ${g.longitude.toFixed(5)}</div>` : ''}
  </div>`;
  const cl = d.querySelector('#gaugeCopy');
  if (cl) cl.onclick = () => { navigator.clipboard?.writeText(location.href);
    cl.textContent = 'copied ✓'; setTimeout(() => cl.textContent = 'copy link', 1200); };
  d.querySelector('.back').onclick = () => { d.classList.remove('show'); $('#list').style.display = 'flex';
    selected = null; selFeat = null; writeHash(); renderList(); };
  d.querySelectorAll('.tab').forEach(b => b.onclick = () => {
    if (b.disabled) return;
    chartMode = b.dataset.mode;
    showDetail(g, info, sf);
    if (chartMode === '1y' && usgs) loadYear(usgs, th);
  });
  if (chartMode === '1y' && usgs) loadYear(usgs, th);
}

async function loadYear(usgsId, th) {
  const start = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  try {
    const j = await (await fetch(`https://waterservices.usgs.gov/nwis/dv/?format=json&sites=${usgsId}` +
      `&parameterCd=00060&startDT=${start}&siteStatus=all`)).json();
    const vals = j.value?.timeSeries?.[0]?.values?.[0]?.value || [];
    const s = vals.map(p => ({ t: +new Date(p.dateTime), v: +p.value })).filter(p => p.v > -999);
    const el = $('#chart');
    if (el && chartMode === '1y') el.innerHTML = s.length
      ? chartSVG(s, [], {}, 'cfs') + '<div class="hint" style="border:0;padding:2px 6px">USGS daily mean discharge, 1 year</div>'
      : '<div class="hint">No USGS daily-value record for this site.</div>';
  } catch (e) { const el = $('#chart'); if (el) el.innerHTML = '<div class="hint">USGS request failed.</div>'; }
}

/* SVG hydrograph: observed line, forecast dashed, flood thresholds as bands. */
function chartSVG(obs, fc, th, unit) {
  const all = obs.concat(fc);
  if (!all.length) return '<div class="hint">No recent observations.</div>';
  const W = 380, H = 150, P = { l: 4, r: 54, t: 12, b: 18 };
  const ths = Object.entries(th || {}).filter(([, v]) => v.stage > -999);
  const xs = all.map(p => p.t), ys = all.map(p => p.v);
  // keep the series readable: extend the scale to the next threshold above the data, no further
  const y0 = Math.min(...ys), dmax = Math.max(...ys), span = (dmax - y0) || 1;
  const next = ths.map(([, v]) => v.stage).filter(v => v > dmax).sort((a, b) => a - b)[0];
  const y1 = next && next < dmax + span * 2 ? next : dmax;
  const pad = (y1 - y0) * 0.12 || 1;
  const sx = t => P.l + (t - Math.min(...xs)) / ((Math.max(...xs) - Math.min(...xs)) || 1) * (W - P.l - P.r);
  const sy = v => H - P.b - (v - (y0 - pad)) / ((y1 + pad - (y0 - pad)) || 1) * (H - P.t - P.b);
  const path = s => s.map((p, i) => (i ? 'L' : 'M') + sx(p.t).toFixed(1) + ' ' + sy(p.v).toFixed(1)).join('');
  const lines = ths.map(([k, v]) => sy(v.stage) > P.t && sy(v.stage) < H - P.b
    ? `<line x1="${P.l}" x2="${W - P.r}" y1="${sy(v.stage).toFixed(1)}" y2="${sy(v.stage).toFixed(1)}"
        stroke="${CATCOLOR[k] || INK55}" stroke-width="1" stroke-dasharray="3 5"/>
       <text x="${W - P.r + 5}" y="${(sy(v.stage) + 3).toFixed(1)}" fill="${CATCOLOR[k] || INK55}" font-size="10" letter-spacing=".5">${k}</text>` : '').join('');
  const last = obs.at(-1) || fc.at(-1);
  const axis = `fill="${INK55}" font-size="10" letter-spacing=".5"`;
  // grey carries the data — the only colour is the thresholds a value can cross
  return `<svg viewBox="0 0 ${W} ${H}" font-family="JetBrains Mono, monospace">
    <line x1="${P.l}" x2="${W - P.r}" y1="${H - P.b}" y2="${H - P.b}" stroke="rgba(244,244,241,0.14)"/>
    ${lines}
    ${obs.length ? `<path d="${path(obs)}" fill="none" stroke="${PAPER}" stroke-width="1.4"/>` : ''}
    ${fc.length ? `<path d="${path(fc)}" fill="none" stroke="${INK35}" stroke-width="1.4" stroke-dasharray="4 3"/>` : ''}
    ${last ? `<rect x="${(sx(last.t) - 2.5).toFixed(1)}" y="${(sy(last.v) - 2.5).toFixed(1)}" width="5" height="5" fill="${PAPER}"/>` : ''}
    <text x="${W - P.r + 5}" y="11" ${axis}>${num(y1)} ${esc(unit)}</text>
    <text x="${W - P.r + 5}" y="${H - P.b}" ${axis}>${num(y0)}</text>
    <text x="${P.l}" y="${H - 4}" ${axis}>${new Date(Math.min(...xs)).toLocaleDateString()}</text>
    <text x="${W - P.r}" y="${H - 4}" ${axis} text-anchor="end">${new Date(Math.max(...xs)).toLocaleDateString()}</text>
  </svg>`;
}

/* ------------------------------------------------------------- chrome/UI */
$('#basemap').onclick = e => {
  const sat = !e.target.classList.toggle('on') ? 'dark' : 'sat';
  map.getSource('base').setTiles(BASEMAPS[sat]);
  map.setPaintProperty('base', 'raster-saturation', sat === 'sat' ? -0.4 : -1);
  map.setPaintProperty('base', 'raster-brightness-max', sat === 'sat' ? 1 : 0.48);
  map.setPaintProperty('labels', 'raster-opacity', sat === 'sat' ? 0.8 : 0.5);
  e.target.textContent = sat === 'sat' ? 'map' : 'sat';
};
$('#keybtn').onclick = e => e.target.classList.toggle('on', document.body.classList.toggle('key'));
$('#gaugebtn').onclick = e => {
  gaugesOn = e.target.classList.toggle('on');
  for (const id of ['gauge-pt', 'gauge-halo'])
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', gaugesOn ? 'visible' : 'none');
  clearInterval(gaugeTimer);
  if (gaugesOn) { loadGauges(); gaugeTimer = setInterval(loadGauges, 5 * 60 * 1000); }
};

// Very subtle breathing on the alert ring — ties "pulsing" to gauges that actually need a look,
// rather than animating all ~200 dots (which would read as noise, not life, on this brand).
function startPulse() {
  clearInterval(pulseTimer);
  pulseTimer = setInterval(() => {
    if (!gaugesOn || document.hidden || !map.getLayer('gauge-halo')) return;
    const t = (Math.sin(Date.now() / 1500) + 1) / 2;
    map.setPaintProperty('gauge-halo', 'circle-stroke-opacity', 0.55 + 0.3 * t);
  }, 200);
}
function setSheet(name) {
  document.body.className = name ? 'sheet-' + name : '';
  document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.sheet === name));
}
document.querySelectorAll('#tabbar button').forEach(b => b.onclick = () => setSheet(b.dataset.sheet));

/* ----------------------------------------------------------- hash state */
function parseHash() {
  const m = /^#(\d+(?:\.\d+)?)\/(-?\d+\.?\d*)\/(-?\d+\.?\d*)(?:\/([^/]*))?(?:\/(.*))?$/.exec(location.hash);
  if (!m) return { zoom: 6.4, lat: 44.6, lng: -85.4, layers: null, sel: null };
  return { zoom: +m[1], lat: +m[2], lng: +m[3], layers: m[4] ? m[4].split(',').filter(Boolean) : null,
    sel: m[5] || null };
}
function writeHash() {
  const c = map.getCenter();
  const sel = selFeat ? (selFeat.l === 'gauge' ? `g:${selFeat.o}` : `l:${selFeat.l}:${selFeat.o}`) : '';
  history.replaceState(null, '', `#${map.getZoom().toFixed(1)}/${c.lat.toFixed(3)}/${c.lng.toFixed(3)}/` +
    DEFS.filter(d => d.on).map(d => d.id).join(',') + (sel ? '/' + sel : ''));
}

// Shareable link → reopen the exact gauge or GIS feature someone linked to.
async function resolveSel(sel) {
  const gm = /^g:(.+)$/.exec(sel);
  if (gm) { if (gauges.some(g => g.lid === gm[1])) selectGauge(gm[1], true); return; }
  const lm = /^l:([\w-]+):(\d+)$/.exec(sel);
  if (!lm) return;
  const def = byId[lm[1]]; if (!def) return;
  if (!def.on) { def.on = true; addLayer(def); loadLayer(def); renderLayers(); }
  try {
    const p = new URLSearchParams({ where: `OBJECTID=${lm[2]}`, outFields: (def.fields || []).join(',') || '*',
      returnGeometry: 'true', f: 'geojson', outSR: '4326' });
    const j = await (await fetch(`${def.url}/query?${p}`)).json();
    const f = j.features?.[0]; if (!f) return;
    const [lng, lat] = firstCoord(f.geometry);
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), (def.minzoom || 9) + 1) });
    setTimeout(() => showPopup(def, f, { lng, lat }), 500);
  } catch (e) { console.warn('resolveSel', e); }
}

/* ------------------------------------------------------------- lifecycle */
let t;
const refreshAll = () => { clearTimeout(t); t = setTimeout(() => { DEFS.forEach(loadLayer); writeHash(); renderLayers(); }, 320); };

map.on('load', () => {
  if (start.layers) DEFS.forEach(d => d.on = start.layers.includes(d.id));
  DEFS.filter(d => d.on).forEach(addLayer);
  renderLayers();
  DEFS.forEach(loadLayer);
  loadGauges().then(() => { if (start.sel) resolveSel(start.sel); });
  gaugeTimer = setInterval(loadGauges, 5 * 60 * 1000);
  startPulse();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && gaugesOn) loadGauges(); });
});
map.on('moveend', refreshAll);
map.on('zoomend', () => $('#zoomhint').textContent = map.getZoom() < 9
  ? 'Zoom in past z9 for stream-level detail.' : 'Viewport layers loaded at this zoom.');

/* ------------------------------------------------------------- self-test */
if (location.search.includes('selftest')) {
  const ok = (c, m) => console[c ? 'log' : 'error'](c ? '✓' : '✗', m);
  const u = queryUrl(byId.streams, [-84, 42, -83, 43], 0.001);
  ok(u.includes('geometry=-84%2C42%2C-83%2C43') && u.includes('f=geojson') && u.includes('maxAllowableOffset'), 'bbox query url');
  ok(!queryUrl(byId.dams, null, 0.01).includes('maxAllowableOffset'), 'points not generalised');
  ok(queryUrl(byId.dams, null, 0, 1000).includes('resultOffset=1000'), 'paging offset applied');
  ok(catOf({ status: { observed: { floodCategory: 'major' } } }) === 'major', 'flood cat mapped');
  ok(catOf({}) === 'offline', 'missing status → offline');
  ok(catRank({ status: { observed: { floodCategory: 'major' } } }) < catRank({}), 'major sorts above offline');
  const svg = chartSVG([{ t: 0, v: 1 }, { t: 100, v: 3 }], [], { minor: { stage: 2 } }, 'ft');
  ok(svg.includes('<path') && svg.includes('minor'), 'chart renders line + threshold');
  ok(chartSVG([], [], {}, 'ft').includes('No recent'), 'empty chart handled');
  ok(new Set(DEFS.map(d => d.id)).size === DEFS.length, 'layer ids unique');
  ok(firstCoord({ coordinates: [-85, 44] }).join(',') === '-85,44', 'firstCoord point');
  ok(firstCoord({ coordinates: [[[-85, 44], [-86, 45]]] }).join(',') === '-85,44', 'firstCoord polygon');
  const fake = /^#(\d+(?:\.\d+)?)\/(-?\d+\.?\d*)\/(-?\d+\.?\d*)(?:\/([^/]*))?(?:\/(.*))?$/.exec('#6.4/44.6/-85.4/lakes,dams/l:dams:123');
  ok(fake[4] === 'lakes,dams' && fake[5] === 'l:dams:123', 'hash regex splits layers + sel');
  ok(FIND_LAYERS.every(id => byId[id]?.title), 'every findable layer has a title field');
  ok(trendOf(10, 12) === 'up' && trendOf(12, 10) === 'down' && trendOf(10, 10) === 'flat', 'trend direction');
  ok(trendOf(null, 10) === null && trendOf(10, -999) === null, 'trend needs two valid readings');
}
