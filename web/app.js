/* 全球旅行风险地图 — 多国官方旅行提示聚合
 * 纯前端、无构建步骤；数据由 scripts/build_data.py 生成。
 */
(() => {
  'use strict';

  // ------------------------------------------------------------------ config
  const RISK = {
    1: { zh: '保持正常防范', en: 'Exercise normal precautions', color: '#2f8f6b' },
    2: { zh: '提高警惕', en: 'Exercise increased caution', color: '#d8a53a' },
    3: { zh: '重新考虑行程', en: 'Reconsider travel', color: '#dd7a37' },
    4: { zh: '请勿前往', en: 'Do not travel', color: '#c0493f' },
    0: { zh: '暂无数据', en: 'No data', color: '#dde2e7' },
  };

  // Optional remote data endpoint (see web/data/remote.js). When configured,
  // the installed app can receive fresh data without reinstalling the HAP.
  const REMOTE_DATA = (window.__REMOTE_DATA__ || '').replace(/\/?$/, '/');
  const REMOTE_CACHE_KEY = 'tra-remote-data-v1';
  const REMOTE_FETCH_KEY = 'tra-remote-fetched-at';
  (function restoreRemoteCache() {
    if (!REMOTE_DATA) return;
    try {
      const cached = JSON.parse(localStorage.getItem(REMOTE_CACHE_KEY) || 'null');
      if (!cached || !cached.risk || !cached.geo) return;
      const cachedAt = Date.parse(cached.risk.generated_at || '') || 0;
      const bundledAt = Date.parse((window.__RISK__ && window.__RISK__.generated_at) || '') || 0;
      if (cachedAt > bundledAt) {
        window.__RISK__ = cached.risk;
        window.__GEO__ = cached.geo;
      }
    } catch (e) { /* ignore corrupt cache */ }
  })();
  const SPREAD = {
    0: { zh: '评估一致', en: 'Broad agreement', color: '#b9c7d4' },
    1: { zh: '轻微差异', en: 'Minor differences', color: '#93a9c0' },
    2: { zh: '明显分歧', en: 'Clear disagreement', color: '#6a86a8' },
    3: { zh: '严重分歧', en: 'Major disagreement', color: '#44618a' },
  };
  const SRC_ORDER = ['us', 'uk', 'ca', 'de', 'cn'];
  const SRC_SHORT_EN = { us: 'US', uk: 'UK', ca: 'Canada', de: 'Germany', cn: 'China' };
  const SRC_EN = {
    us: 'U.S. State Dept.', uk: 'UK FCDO', ca: 'Global Affairs Canada',
    de: 'German Foreign Office', cn: 'China MFA',
  };
  const MODES = ['agg', 'max', 'spread', 'us', 'uk', 'ca', 'de', 'cn'];
  const POINT_RADIUS_KM = {
    SG: 38, MT: 22, BH: 18, MV: 40, SC: 25, MU: 22, KM: 25, ST: 25, CV: 40,
    MC: 3, SM: 6, VA: 2, LI: 7, AD: 10, HK: 25, MO: 12,
  };

  const I18N = {
    zh: {
      docTitle: 'ReadyToGo',
      appTitle: 'ReadyToGo',
      appSub: '全球旅行风险提示 · TRAVEL RISK ATLAS',
      search: '搜索国家或地区…',
      noResults: '没有找到匹配的国家或地区',
      basemap: '底图',
      hint: '点击任意国家查看各国官方提示 · 滚轮缩放',
      menu: '菜单',
      reset: '重置视图',
      themeDark: '切换到深色模式',
      themeLight: '切换到浅色模式',
      dockLocate: '定位',
      dockTheme: '主题',
      dockSearch: '搜索',
      dockMenu: '菜单',
      dockRefresh: '刷新数据',
      refreshingData: '正在重新获取风险数据…',
      dataUpdated: '风险数据已更新',
      dataRefreshFailed: '获取失败，请检查网络后重试',
      locateHint: '定位到所在国家',
      geoDenied: '无法获取位置，请在系统设置中允许定位',
      geoNoCountry: '已定位，但未识别所在国家',
      yourLocation: '你的位置',
      noData: '暂无数据',
      countriesSuffix: '个国家 / 地区',
      sourcesSuffix: '个官方来源',
      view: '视图',
      sources: '参与聚合的来源',
      legend: '图例',
      about: '数据来源与方法说明',
      top8: 'TOP 8',
      modeAgg: '综合评估',
      modeMax: '最严评估',
      modeSpread: '分歧度',
      rankHigh: '风险最高',
      rankStrict: '最严等级',
      rankSpread: '分歧最大',
      rankSource: '该国评级最高',
      statCountries: (n) => n + ' 个国家 / 地区',
      statHigh: '高风险',
      statSources: (n) => n + ' 个官方来源',
      countryCount: (n) => n + ' 国',
      levelWord: '等级',
      sourcesWord: '个来源',
      median: '中位数',
      mean: '均值',
      official: '各国官方提示',
      emergency: '应急电话',
      localDial: '当地直拨',
      police: '报警',
      ambulance: '急救',
      fire: '消防',
      dispatch: '统一',
      emergencyShort: '紧急',
      noEmergency: '暂未收录该目的地的应急电话。',
      emergencyNote: '公开数据整理，拨号前请确认当地适用号码。',
      riskPoints: '风险要点',
      cnAdviceFrom: '中国外交部安全提醒（原文）',
      usAdviceFrom: '美国国务院提示摘要（原文）',
      viewOfficial: '查看官方原文 ↗',
      missingSource: '未发布该目的地的正式旅行提示',
      partial: '（部分地区）',
      noDataDest: '该目的地未被已接入的官方来源覆盖。',
      spreadWord: '分歧度',
      insufficient: '来源不足',
      noCompare: '无法比较',
      insufficientTip: '来源不足，无法比较',
      notCoveredTip: '当前来源未覆盖',
      nodataLegend: '无数据 / 未覆盖',
      detailNote: '风险等级为各国官方提示的归一化结果（1–4 级），供横向比较参考；不同国家评估口径、更新时间与地域范围不同，出行前请务必查阅官方原文。',
      summaryNone: '当前选中的来源均未收录该目的地。',
      generated: (d, n) => '抓取于 ' + d + ' · 共 ' + n + ' 个国家/地区',
      initError: (m) => '应用初始化失败：' + m,
      loadError: (f) => '无法加载 ' + f,
      modal: {
        title: '数据来源与方法说明',
        intro: '本工具不自行评定风险，而是把各国政府面向本国公民发布的旅行提示，归一化到统一等级后并列展示。',
        sources: '接入的官方来源',
        perSource: (n) => n + ' 个国家/地区',
        maxLevel: '最多 4 级',
        normTitle: '等级归一化',
        normText: '美国、加拿大采用官方 1–4 级；英国以「建议不要前往 / 避免非必要旅行」及是否仅限部分地区换算为 3–4 级，无警告记 1 级；德国仅在发布正式「旅行警告（Reisewarnung）」或「部分地区警告」时计入 4 / 3 级，未发布警告的目的地不参与聚合，避免把「无警告」误当作「安全」。中国外交部按红色（极高风险）、橙色（高风险）、黄色（中风险）、蓝色（低风险）发布，对应 4–1 级；若仅部分地区为高风险，按全国最高等级计入并标注「部分地区」。',
        aggTitle: '聚合方式',
        aggItems: [
          '综合评估：取所选来源等级的中位数（偶数个来源取中间两值平均后四舍五入），偏保守。',
          '最严评估：取所选来源中的最高等级，反映最谨慎政府的判断。',
          '分歧度：最高等级与最低等级之差（0–3），数值越大说明各国判断差异越明显。',
          '侧边栏可勾选参与聚合的来源，地图与排名会实时重算。',
        ],
        emergencyTitle: '应急电话',
        emergencyText: '警察、急救、消防号码来自公开整理的各国紧急电话号码表（原始数据见 Wikipedia 的《List of emergency telephone numbers》，经 GitHub 数据集整理）。按 ISO 国家代码映射后随详情展示，可点击直接拨号。同一号码覆盖多个服务时合并为一个按钮；号码可能因地区、运营商而异，出境前请以当地官方信息为准。',
        limitsTitle: '已知局限',
        limits: [
          '各国提示面向本国公民，安全环境、双边关系与使馆能力会影响评级，不能等同于「客观安全度」。',
          '部分国家的警告仅覆盖特定地区，这里按该国最高等级展示，并在详情中标注「部分地区」。',
          '各来源更新频率不同，页面展示的是抓取时点的内容；中国领事服务网页面未提供逐条更新日期。',
          '应急电话来自公开数据集，可能因地区、运营商或政策变化而过时；部分小岛屿属地没有收录。',
          '美国对本国不发布旅行提示；部分小岛屿属地只有个别国家覆盖。',
          '本工具仅供出行研究参考，不构成安全建议，请以各国外交部门原文为准。',
        ],
        footer: (d) => '数据抓取：' + d + ' · 边界数据：Natural Earth',
      },
    },
    en: {
      docTitle: 'ReadyToGo',
      appTitle: 'ReadyToGo',
      appSub: 'Global travel advisories · TRAVEL RISK ATLAS',
      search: 'Search countries or regions…',
      noResults: 'No matching country or region',
      basemap: 'Basemap',
      hint: 'Click a country for official advisories · scroll to zoom',
      menu: 'Menu',
      reset: 'Reset view',
      themeDark: 'Switch to dark mode',
      themeLight: 'Switch to light mode',
      dockLocate: 'Locate',
      dockTheme: 'Theme',
      dockSearch: 'Search',
      dockMenu: 'Menu',
      dockRefresh: 'Refresh',
      refreshingData: 'Fetching latest risk data…',
      dataUpdated: 'Risk data updated',
      dataRefreshFailed: 'Fetch failed — check your connection',
      locateHint: 'Locate your country',
      geoDenied: 'Location unavailable — allow location access',
      geoNoCountry: 'Located, but country not recognised',
      yourLocation: 'Your location',
      noData: 'No data',
      countriesSuffix: 'countries & regions',
      sourcesSuffix: 'official sources',
      view: 'View',
      sources: 'Sources in aggregate',
      legend: 'Legend',
      about: 'Sources & methodology',
      top8: 'TOP 8',
      modeAgg: 'Combined',
      modeMax: 'Strictest',
      modeSpread: 'Disagreement',
      rankHigh: 'Highest risk',
      rankStrict: 'Strictest rating',
      rankSpread: 'Biggest disagreement',
      rankSource: 'Highest rating',
      statCountries: (n) => n + ' countries & regions',
      statHigh: 'high risk',
      statSources: (n) => n + ' official sources',
      countryCount: (n) => n + ' countries',
      levelWord: 'Level',
      sourcesWord: 'sources',
      median: 'median',
      mean: 'mean',
      official: 'Official advisories',
      emergency: 'Emergency numbers',
      localDial: 'Dial locally',
      police: 'Police',
      ambulance: 'Ambulance',
      fire: 'Fire',
      dispatch: 'General',
      emergencyShort: 'Emergency',
      noEmergency: 'No emergency numbers recorded for this destination.',
      emergencyNote: 'Compiled from public data; confirm local numbers before dialling.',
      riskPoints: 'Risk summary',
      cnAdviceFrom: 'China MFA safety reminder (original)',
      usAdviceFrom: 'U.S. State Department summary (original)',
      viewOfficial: 'Read official advisory ↗',
      missingSource: 'No advisory published for this destination',
      partial: ' (some regions)',
      noDataDest: 'This destination is not covered by the selected sources.',
      spreadWord: 'Spread',
      insufficient: 'Too few sources',
      noCompare: 'cannot compare',
      insufficientTip: 'Not enough sources to compare',
      notCoveredTip: 'Not covered by this source',
      nodataLegend: 'No data / not covered',
      detailNote: 'Levels are normalized from official advisories (1–4) for comparison only. Each government assesses risk differently and updates on its own schedule; always check the original advisory before travelling.',
      summaryNone: 'None of the selected sources cover this destination.',
      generated: (d, n) => 'Fetched ' + d + ' · ' + n + ' countries & regions',
      initError: (m) => 'Failed to start the app: ' + m,
      loadError: (f) => 'Could not load ' + f,
      modal: {
        title: 'Data sources & methodology',
        intro: 'This tool does not rate countries itself. It normalizes the travel advisories governments issue for their own citizens and shows them side by side.',
        sources: 'Official sources',
        perSource: (n) => n + ' destinations',
        maxLevel: '4 levels',
        normTitle: 'Normalization',
        normText: 'The US and Canada publish official 1–4 levels. For the UK, "advise against all travel" / "all but essential travel" plus whether it applies only to parts of a country maps to 3–4; no warning counts as level 1. Germany is included only when it issues a formal Reisewarnung (4) or partial warning (3); destinations without a warning are excluded rather than treated as safe. China\'s MFA publishes four colours — red (very high), orange (high), yellow (medium), blue (low) — mapped to 4–1; when only parts of a country are high risk, the national maximum is used and flagged as "some regions".',
        aggTitle: 'Aggregation',
        aggItems: [
          'Combined: median of the selected sources (for an even count, average the two middle values and round up), deliberately conservative.',
          'Strictest: the highest level among the selected sources.',
          'Disagreement: max minus min (0–3); larger means governments judge the destination more differently.',
          'Untick sources in the sidebar to recompute the map and rankings live.',
        ],
        emergencyTitle: 'Emergency numbers',
        emergencyText: 'Police, ambulance and fire numbers come from a public compilation of national emergency numbers (original table: Wikipedia\'s List of emergency telephone numbers, packaged as a GitHub dataset). Numbers are mapped by ISO country code and shown in each detail panel with click-to-dial. When one number covers several services it is merged into a single button; numbers can vary by region or carrier, so confirm locally before dialling.',
        limitsTitle: 'Known limitations',
        limits: [
          'Advisories are written for each government\'s own citizens; embassy capacity and bilateral relations affect ratings, so they are not an objective safety score.',
          'Many warnings cover only specific regions; this atlas shows the highest national level and flags "some regions", which can overstate overall risk.',
          'Update frequency varies from days to years; China\'s consular pages do not show per-item update dates.',
          'Emergency numbers come from a public dataset and can go stale; a few small island territories are missing.',
          'The US does not issue an advisory for itself; some small territories are covered by only one or two sources.',
          'Data is a snapshot. Re-run the fetch scripts after policy changes.',
        ],
        footer: (d) => 'Data fetched ' + d + ' · Basemap: Natural Earth',
      },
    },
  };

  const state = {
    lang: 'zh',
    theme: 'light',
    mode: 'agg',
    enabled: new Set(SRC_ORDER),
    selected: null,
    hovered: null,
    data: null,
    byIso: {},
    geo: null,
  };

  let map, layers = {}, markers = {};
  let userMarker = null;
  let pointsRenderer = null;
  let clampingLat = false;
  const worldCopies = new Map(); // offset -> [layers]
  const $ = (sel) => document.querySelector(sel);

  // -------------------------------------------------------------------- boot
  init().catch((err) => {
    console.error(err);
    const el = $('#error-banner');
    el.textContent = T('initError')(err && err.message ? err.message : String(err));
    el.hidden = false;
  });

  async function init() {
    const params = new URLSearchParams(location.search);
    if (params.has('nofx')) document.documentElement.classList.add('nofx');

    let saved = null;
    try { saved = localStorage.getItem('tra-lang'); } catch (e) { /* private mode */ }
    const wanted = params.get('lang') || saved;
    if (wanted === 'en' || wanted === 'zh') state.lang = wanted;

    let savedTheme = null;
    try { savedTheme = localStorage.getItem('tra-theme'); } catch (e) { /* private mode */ }
    state.theme = savedTheme === 'dark' || savedTheme === 'light'
      ? savedTheme
      : (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const themeParam = params.get('theme');
    if (themeParam === 'dark' || themeParam === 'light') state.theme = themeParam;
    document.documentElement.dataset.theme = state.theme;

    let riskData = window.__RISK__;
    let geoData = window.__GEO__;
    if (!riskData || !geoData) {
      const [riskRes, geoRes] = await Promise.all([
        fetch('data/risk.json', { cache: 'no-cache' }),
        fetch('data/countries.geojson', { cache: 'no-cache' }),
      ]);
      if (!riskRes.ok) throw new Error(T('loadError')('risk.json (' + riskRes.status + ')'));
      if (!geoRes.ok) throw new Error(T('loadError')('countries.geojson (' + geoRes.status + ')'));
      riskData = await riskRes.json();
      geoData = await geoRes.json();
    }
    state.data = riskData;
    state.geo = geoData;
    state.data.countries.forEach((c) => { state.byIso[c.iso2] = c; });

    const modeParam = params.get('mode');
    if (modeParam && MODES.includes(modeParam)) state.mode = modeParam;

    buildMap();
    buildModes();
    buildSources();
    bindUI();
    applyLanguage();
    applyTheme();

    const initial = (params.get('iso') ||
      decodeURIComponent(location.hash.replace(/^#\/?/, '')) || '').toUpperCase();
    if (initial && state.byIso[initial]) {
      setTimeout(() => select(initial, true), 350);
    }
    if (params.has('search')) {
      setTimeout(openSearch, 400);
    }

    if (REMOTE_DATA) {
      // installed app with a remote endpoint: check for fresh data on launch
      scheduleMidnightRefresh();
      setTimeout(() => {
        if (navigator.onLine) refreshRiskData(true);
      }, 2500);
    } else if (/^https?:$/.test(location.protocol)) {
      scheduleMidnightRefresh();
      setTimeout(() => {
        if (!navigator.onLine) return;
        const ts = Date.parse((state.data && state.data.generated_at) || '');
        if (!ts || Date.now() - ts > 24 * 3600 * 1000) refreshRiskData(true);
      }, 3000);
    }
  }

  // --------------------------------------------------------------------- map
  // A small, growable set of world copies. Copies are added off-screen as the
  // user approaches the edge, so crossing 180° never teleports the camera.

  function buildMap() {
    map = L.map('map', {
      zoomControl: false,
      minZoom: 2,
      maxZoom: 6,
      zoomSnap: 0.5,
      wheelPxPerZoomLevel: 110,
      attributionControl: false,
      // paint a generous buffer around the viewport so paths don't vanish
      // at the edges while dragging, before moveend re-renders them
      renderer: L.svg({ padding: 0.5 }),
    }).setView([30, 10], 2);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // points (small states/islands) get their own pane above country polygons,
    // so a selected neighbour's fill can never cover them
    map.createPane('pointsPane');
    map.getPane('pointsPane').style.zIndex = '450';
    pointsRenderer = L.svg({ pane: 'pointsPane', padding: 0.5 });

    // graticule — covers several world widths, so it stays aligned when copies grow
    const grid = L.layerGroup();
    for (let lat = -60; lat <= 80; lat += 20) {
      const pts = [];
      for (let lon = -7200; lon <= 7200; lon += 30) pts.push([lat, lon]);
      L.polyline(pts, { color: '#c3d0db', weight: 0.6, opacity: 0.55, dashArray: '2 6', interactive: false }).addTo(grid);
    }
    for (let lon = -7200; lon <= 7200; lon += 30) {
      const pts = [];
      for (let lat = -85; lat <= 85; lat += 10) pts.push([lat, lon]);
      L.polyline(pts, { color: '#c3d0db', weight: 0.6, opacity: 0.55, dashArray: '2 6', interactive: false }).addTo(grid);
    }
    grid.addTo(map);

    [-360, 0, 360].forEach(addWorldCopy);
    map.on('moveend', ensureWorldCopies);

    // warm the copies one world further out after the first paint, so a long
    // drag does not have to stop and build hundreds of layers when released
    const warmCopies = () => {
      [-720, 720].forEach((off) => {
        if (!worldCopies.has(off)) addWorldCopy(off);
      });
      ensureWorldCopies();
    };
    if (window.requestIdleCallback) {
      window.requestIdleCallback(warmCopies, { timeout: 2500 });
    } else {
      setTimeout(warmCopies, 1200);
    }
  }

  function addWorldCopy(offset) {
    if (worldCopies.has(offset)) return;
    const added = [];
    const geo = L.geoJSON(state.geo, {
      coordsToLatLng: (coords) => L.latLng(coords[1], coords[0] + offset),
      style: (f) => baseStyle(f.properties.iso2),
      onEachFeature: (f, layer) => bindCountry(layer, f.properties.iso2),
    });
    geo.eachLayer((layer) => {
      layer.addTo(map);
      added.push(layer);
    });
    state.data.countries.forEach((c) => {
      if (c.has_geom || !c.lat || !c.lon) return;
      const m = L.circleMarker([c.lat, c.lon + offset], {
        radius: 4.6, weight: 1.2, color: '#ffffff',
        fillColor: RISK[0].color, fillOpacity: 0.95,
        bubblingMouseEvents: false,
        pane: 'pointsPane',
        renderer: pointsRenderer,
      }).addTo(map);
      bindCountry(m, c.iso2);
      added.push(m);
    });
    worldCopies.set(offset, added);

    // a copy created after the initial render (warm-up or edge growth) must
    // inherit the current mode/selection styles, otherwise its points stay gray
    const touched = new Set();
    added.forEach((layer) => { if (layer._iso) touched.add(layer._iso); });
    touched.forEach((iso) => applyLayerStyle(iso));
  }

  function removeWorldCopy(offset) {
    const arr = worldCopies.get(offset);
    if (!arr) return;
    arr.forEach((layer) => {
      const iso = layer._iso;
      if (iso) {
        if (layers[iso]) layers[iso] = layers[iso].filter((x) => x !== layer);
        if (markers[iso]) markers[iso] = markers[iso].filter((x) => x !== layer);
      }
      map.removeLayer(layer);
    });
    worldCopies.delete(offset);
  }

  function ensureWorldCopies() {
    if (!map) return;
    const c = map.getCenter().lng;
    let guard = 0;
    while (worldCopies.size && c > Math.max(...worldCopies.keys()) && guard++ < 6) {
      addWorldCopy(Math.max(...worldCopies.keys()) + 360);
    }
    guard = 0;
    while (worldCopies.size && c < Math.min(...worldCopies.keys()) && guard++ < 6) {
      addWorldCopy(Math.min(...worldCopies.keys()) - 360);
    }
    worldCopies.forEach((arr, off) => {
      if (Math.abs(off - c) > 1080) removeWorldCopy(off);
    });

    // vertical limits: keep the map inside the populated latitudes
    const center = map.getCenter();
    if (!clampingLat && (center.lat > 85 || center.lat < -59)) {
      clampingLat = true;
      map.setView([Math.max(-58, Math.min(84, center.lat)), center.lng], map.getZoom(), { animate: false });
      clampingLat = false;
    }
  }

  function bindCountry(layer, iso) {
    const isPoint = layer instanceof L.CircleMarker;
    layer._iso = iso;
    const store = isPoint ? markers : layers;
    (store[iso] = store[iso] || []).push(layer);
    layer.bindTooltip(() => tipHtml(iso), {
      sticky: true, className: 'risk-tip', direction: 'top',
      offset: [0, isPoint ? -4 : -6], opacity: 1,
    });
    layer.on({
      mouseover: () => setHover(layer, iso, true),
      mouseout: () => setHover(layer, iso, false),
      click: () => select(iso, false),
    });
  }

  function valueFor(iso) {
    const c = state.byIso[iso];
    if (!c) return { v: 0, agg: { n: 0, level: 0 } };
    const agg = aggFor(c);
    let v = 0;
    if (state.mode === 'agg') v = agg.level;
    else if (state.mode === 'max') v = agg.n ? agg.max : 0;
    else if (state.mode === 'spread') v = agg.n >= 2 ? agg.spread : -1;
    else {
      const s = c.sources[state.mode];
      v = s ? s.level : 0;
    }
    return { v, agg };
  }

  function colorFor(v) {
    if (state.mode === 'spread') {
      if (v < 0) return '#e4e7ea';
      return SPREAD[Math.min(v, 3)].color;
    }
    if (!v) return noDataColor();
    return (RISK[v] || RISK[0]).color;
  }

  function mapBorderColor() { return state.theme === 'dark' ? '#0a121a' : '#ffffff'; }
  function mapHoverColor() { return state.theme === 'dark' ? '#ffffff' : '#0d1720'; }
  function noDataColor() { return state.theme === 'dark' ? '#26323e' : '#dfe3e6'; }

  function baseStyle(iso) {
    const { v } = valueFor(iso);
    const has = state.byIso[iso] ? 1 : 0;
    const vv = state.mode === 'spread' && v < 0 ? -1 : v;
    return {
      fillColor: colorFor(vv),
      fillOpacity: has ? (vv === 0 ? 0.55 : 0.9) : 0.35,
      color: mapBorderColor(),
      weight: 0.75,
      opacity: 0.95,
      bubblingMouseEvents: false,
    };
  }

  function setHover(layer, iso, on) {
    if (on) {
      state.hovered = iso;
      const isPoint = layer instanceof L.CircleMarker;
      if (isPoint) {
        layer.setStyle({ weight: 2.4, color: mapHoverColor(), radius: 6 });
      } else {
        const b = baseStyle(iso);
        layer.setStyle(Object.assign({}, b, {
          weight: 1.7, color: mapHoverColor(), fillOpacity: Math.min(1, b.fillOpacity + 0.08),
        }));
        layer.bringToFront();
      }
    } else {
      state.hovered = null;
      applyLayerStyle(iso);
    }
  }

  function applyLayerStyle(iso) {
    const polys = layers[iso] || [];
    const points = markers[iso] || [];
    if (!polys.length && !points.length) return;
    const b = baseStyle(iso);
    polys.forEach((layer) => {
      if (state.selected === iso) {
        layer.setStyle(Object.assign({}, b, {
          weight: 2.3, color: mapHoverColor(), dashArray: '4 3', fillOpacity: Math.min(1, b.fillOpacity + 0.05),
        }));
        layer.bringToFront();
      } else {
        layer.setStyle(Object.assign({}, b, { dashArray: null }));
      }
    });
    points.forEach((m) => {
      m.setStyle({
        fillColor: b.fillColor, fillOpacity: b.fillOpacity,
        weight: state.selected === iso ? 3 : 1.2,
        color: state.selected === iso ? mapHoverColor() : '#ffffff',
        radius: state.selected === iso ? 6.5 : 4.6,
      });
    });
  }

  function tipHtml(iso) {
    const c = state.byIso[iso];
    if (!c) {
      return '<div class="tip-name">' + esc(iso) + '</div><div class="tip-sub">' + esc(T('noData')) + '</div>';
    }
    const { v, agg } = valueFor(iso);
    let label, color;
    if (state.mode === 'spread') {
      label = v < 0 ? T('insufficientTip')
        : T('spreadWord') + ' ' + v + ' · ' + SPREAD[Math.min(v, 3)][state.lang];
      color = v < 0 ? '#9aa5ae' : SPREAD[Math.min(v, 3)].color;
    } else if (v === 0) {
      label = T('notCoveredTip');
      color = '#9aa5ae';
    } else {
      label = T('levelWord') + ' ' + v + ' · ' + RISK[v][state.lang];
      color = RISK[v].color;
    }
    const sub = MODES.includes(state.mode) && !['agg', 'max', 'spread'].includes(state.mode)
      ? srcName(state.mode)
      : T('statSources')(agg.n);
    return (
      '<div class="tip-name">' + cc(iso) + ' ' + esc(countryName(c)) + '</div>' +
      '<div class="tip-sub">' + esc(otherName(c)) + ' · ' + esc(sub) + '</div>' +
      '<div class="tip-lv"><i style="background:' + color + '"></i>' + esc(label) + '</div>'
    );
  }

  // ---------------------------------------------------------------- aggregate
  function aggFor(c) {
    const levels = SRC_ORDER
      .filter((id) => state.enabled.has(id) && c.sources[id] && c.sources[id].level)
      .map((id) => c.sources[id].level);
    if (!levels.length) return { n: 0, level: 0, median: 0, mean: 0, max: 0, min: 0, spread: 0 };
    const sorted = [...levels].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const mean = levels.reduce((a, b) => a + b, 0) / levels.length;
    return {
      n: levels.length,
      median,
      mean: Math.round(mean * 100) / 100,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      spread: sorted[sorted.length - 1] - sorted[0],
      level: Math.round(median + 1e-9),
    };
  }

  // -------------------------------------------------------------------- UI
  function buildModes() {
    const box = $('#modes');
    box.innerHTML = '';
    MODES.forEach((id) => {
      const b = document.createElement('button');
      b.className = 'chip' + (id === state.mode ? ' active' : '');
      b.textContent = modeLabel(id);
      b.dataset.mode = id;
      b.addEventListener('click', () => {
        state.mode = id;
        box.querySelectorAll('.chip').forEach((x) => x.classList.toggle('active', x.dataset.mode === id));
        refreshAll();
        if (state.selected) renderDetail(state.selected);
      });
      box.appendChild(b);
    });
  }

  function buildSources() {
    const box = $('#source-toggles');
    box.innerHTML = '';
    SRC_ORDER.forEach((id) => {
      const meta = state.data.sources[id];
      const count = state.data.countries.filter((c) => c.sources[id]).length;
      const on = state.enabled.has(id);
      const row = document.createElement('label');
      row.className = 'source-row' + (on ? '' : ' dim');
      row.innerHTML =
        '<input type="checkbox"' + (on ? ' checked' : '') + ' data-src="' + id + '">' +
        '<span class="box"></span>' +
        '<span class="cc src-cc">' + esc(meta.short) + '</span>' +
        '<span class="nm">' + esc(srcName(id)) + '</span>' +
        '<span class="cnt">' + esc(T('countryCount')(count)) + '</span>';
      const input = row.querySelector('input');
      input.addEventListener('change', () => {
        if (!input.checked && state.enabled.size <= 1) {
          input.checked = true;
          return;
        }
        if (input.checked) state.enabled.add(id);
        else state.enabled.delete(id);
        row.classList.toggle('dim', !input.checked);
        $('#src-note').textContent = state.enabled.size + ' / ' + SRC_ORDER.length;
        refreshAll();
        if (state.selected) renderDetail(state.selected);
      });
      box.appendChild(row);
    });
    $('#src-note').textContent = state.enabled.size + ' / ' + SRC_ORDER.length;
  }

  function bindUI() {
    $('#detail-close').addEventListener('click', closeDetail);

    // mobile gestures: swipe down (when content is at the top) or horizontally to dismiss
    const detailEl = $('#detail');
    const bodyEl = $('#detail-body');
    let gX = 0;
    let gY = 0;
    let gMode = '';
    let gDx = 0;
    let gDy = 0;
    let gActive = false;

    detailEl.addEventListener('touchstart', (e) => {
      if (window.innerWidth > 980 || e.touches.length !== 1) return;
      if (e.target.closest('a, button, input, .emerg-item')) return;
      gX = e.touches[0].clientX;
      gY = e.touches[0].clientY;
      gMode = '';
      gDx = 0;
      gDy = 0;
      gActive = true;
    }, { passive: true });

    detailEl.addEventListener('touchmove', (e) => {
      if (!gActive) return;
      const dx = e.touches[0].clientX - gX;
      const dy = e.touches[0].clientY - gY;
      if (!gMode) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dx) > Math.abs(dy)) gMode = 'x';
        else if (bodyEl.scrollTop <= 0 && dy > 0) gMode = 'y';
        else gMode = 'scroll';
      }
      if (gMode === 'y') {
        e.preventDefault();
        gDy = Math.max(0, dy);
        detailEl.style.transform = 'translateY(' + gDy + 'px)';
      } else if (gMode === 'x') {
        gDx = dx;
      }
    }, { passive: false });

    const endGesture = () => {
      if (!gActive) return;
      gActive = false;
      detailEl.style.transform = '';
      if (gMode === 'y' && gDy > 90) closeDetail();
      else if (gMode === 'x' && Math.abs(gDx) > 90) closeDetail();
      gMode = '';
      gDx = 0;
      gDy = 0;
    };
    detailEl.addEventListener('touchend', endGesture);
    detailEl.addEventListener('touchcancel', endGesture);
    map.on('click', () => {
      $('#sidebar').classList.remove('open');
      if (state.selected) closeDetail();
    });
    $('#about-btn').addEventListener('click', openModal);
    const closeModal = () => { $('#modal').hidden = true; syncOverlayState(); };
    $('#modal-close').addEventListener('click', closeModal);
    $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
    $('#scrim').addEventListener('click', () => {
      if (!$('#search-panel').hidden) closeSearch();
      else closeDetail();
    });

    // bottom dock
    $('#dock-locate').addEventListener('click', locateUser);
    $('#dock-theme').addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('tra-theme', state.theme); } catch (e) { /* ignore */ }
      applyTheme();
    });
    $('#dock-menu').addEventListener('click', toggleSidebar);
    $('#dock-refresh').addEventListener('click', refreshRiskData);
    $('#dock-search').addEventListener('click', openSearch);
    $('#dock-search-close').addEventListener('click', closeSearch);
    $('#dock-search-input').addEventListener('input', (e) => renderDockResults(e.target.value));
    $('#dock-search-input').addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSearch();
      } else if (e.key === 'Enter') {
        const first = document.querySelector('#dock-search-results .sp-item');
        if (first) {
          const iso = first.dataset.iso;
          closeSearch();
          select(iso, true);
        }
      }
    });

    // moving light block under the dock
    const dockEl = $('#dock');
    const dockGlow = $('#dock-glow');
    let dockGlowTarget = $('#dock-locate');

    function positionDockGlow(btn, show) {
      if (!btn) return;
      const d = dockEl.getBoundingClientRect();
      const b = btn.getBoundingClientRect();
      dockGlow.style.width = b.width + 'px';
      dockGlow.style.height = b.height + 'px';
      dockGlow.style.transform = 'translate(' +
        (b.left - d.left - dockEl.clientLeft) + 'px,' +
        (b.top - d.top - dockEl.clientTop) + 'px)';
      if (show) dockGlow.classList.add('show');
    }
    document.querySelectorAll('.dock-item').forEach((btn) => {
      btn.addEventListener('pointerdown', () => {
        dockGlowTarget = btn;
        positionDockGlow(btn, true);
      }, { passive: true });
      btn.addEventListener('click', () => {
        dockGlowTarget = btn;
        positionDockGlow(btn, true);
      });
    });
    requestAnimationFrame(() => positionDockGlow(dockGlowTarget, false));
    window.addEventListener('resize', () => {
      positionDockGlow(dockGlowTarget, dockGlow.classList.contains('show'));
    });

    // language switch
    document.querySelectorAll('.lang-switch button').forEach((b) => {
      b.addEventListener('click', () => setLang(b.dataset.lang));
    });

    // search
    const input = $('#search');
    const results = $('#search-results');
    let active = -1;
    let matches = [];
    const closeResults = () => { results.hidden = true; active = -1; };

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { closeResults(); return; }
      matches = state.data.countries.filter((c) =>
        c.name_zh.toLowerCase().includes(q) ||
        c.name_en.toLowerCase().includes(q) ||
        c.iso2.toLowerCase() === q ||
        (c.iso3 || '').toLowerCase() === q
      ).slice(0, 8);
      results.innerHTML = matches.length
        ? matches.map((c, i) => {
            const { v } = valueFor(c.iso2);
            const col = colorFor(v);
            return '<div class="search-item" data-i="' + i + '">' +
              cc(c.iso2) +
              '<span class="nm">' + esc(countryName(c)) + ' <span class="en">' + esc(otherName(c)) + '</span></span>' +
              '<span class="lv" style="background:' + col + '">' + (v > 0 ? v : '·') + '</span></div>';
          }).join('')
        : '<div class="search-empty">' + esc(T('noResults')) + '</div>';
      results.hidden = false;
      active = -1;
    });

    input.addEventListener('keydown', (e) => {
      const items = [...results.querySelectorAll('.search-item')];
      if (e.key === 'ArrowDown' && items.length) {
        e.preventDefault(); active = Math.min(active + 1, items.length - 1);
      } else if (e.key === 'ArrowUp' && items.length) {
        e.preventDefault(); active = Math.max(active - 1, 0);
      } else if (e.key === 'Enter' && active >= 0 && matches[active]) {
        e.preventDefault();
        select(matches[active].iso2, true);
        input.value = countryName(matches[active]);
        closeResults();
      } else if (e.key === 'Escape') {
        closeResults();
      }
      items.forEach((el, i) => el.classList.toggle('active', i === active));
    });

    results.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.search-item');
      if (!item) return;
      e.preventDefault();
      const c = matches[Number(item.dataset.i)];
      if (!c) return;
      select(c.iso2, true);
      input.value = countryName(c);
      closeResults();
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrap')) closeResults();
    });

    document.addEventListener('click', (e) => {
      const link = e.target && e.target.closest ? e.target.closest('a[href^="http"]') : null;
      if (!link) return;
      if (window.appBridge && typeof window.appBridge.openUrl === 'function') {
        e.preventDefault();
        try {
          window.appBridge.openUrl(link.href);
        } catch (err) { /* fall back to normal navigation */ }
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      if (REMOTE_DATA) {
        const last = Number(localStorage.getItem(REMOTE_FETCH_KEY) || 0);
        if (!last || Date.now() - last > 6 * 3600 * 1000) refreshRiskData(true);
        return;
      }
      if (!/^https?:$/.test(location.protocol)) return;
      const ts = Date.parse((state.data && state.data.generated_at) || '');
      if (!ts || Date.now() - ts > 24 * 3600 * 1000) refreshRiskData(true);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!$('#modal').hidden) {
          $('#modal').hidden = true;
          syncOverlayState();
        } else if (!$('#search-panel').hidden) {
          closeSearch();
        } else {
          closeDetail();
        }
      }
    });
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.style.colorScheme = state.theme;
    const btn = $('#dock-theme');
    if (btn) btn.title = T(state.theme === 'dark' ? 'themeLight' : 'themeDark');
    if (!map) return;
    Object.keys(layers).forEach(applyLayerStyle);
    Object.keys(markers).forEach(applyLayerStyle);
    refreshAll();
    if (state.selected) {
      const body = $('#detail-body');
      const sc = body.scrollTop;
      renderDetail(state.selected);
      body.scrollTop = sc;
    }
  }

  function setLang(lang) {
    if (lang !== 'zh' && lang !== 'en') return;
    state.lang = lang;
    try { localStorage.setItem('tra-lang', lang); } catch (e) { /* ignore */ }
    applyLanguage();
    if (state.selected) renderDetail(state.selected);
    if (!$('#modal').hidden) openModal();
  }

  function applyLanguage() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
    document.body.classList.toggle('lang-en', state.lang === 'en');
    document.title = T('docTitle');

    $('#app-title').textContent = T('appTitle');
    $('#app-sub').textContent = T('appSub');
    $('#search').placeholder = T('search');
    $('#view-heading').textContent = T('view');
    $('#sources-heading').textContent = T('sources');
    $('#legend-heading').textContent = T('legend');
    $('#about-btn').textContent = T('about');
    $('#dock-locate-label').textContent = T('dockLocate');
    $('#dock-theme-label').textContent = T('dockTheme');
    $('#dock-search-label').textContent = T('dockSearch');
    $('#dock-menu-label').textContent = T('dockMenu');
    $('#dock-refresh-label').textContent = T('dockRefresh');
    $('#hint').textContent = T('hint');
    $('#dock-locate').title = T('locateHint');
    $('#dock-menu').title = T('menu');
    const themeBtn = $('#dock-theme');
    if (themeBtn) themeBtn.title = T(state.theme === 'dark' ? 'themeLight' : 'themeDark');
    document.querySelectorAll('.lang-switch button').forEach((b) => {
      b.classList.toggle('active', b.dataset.lang === state.lang);
    });

    buildModes();
    buildSources();
    refreshAll();
    renderGenerated();
  }

  function refreshAll() {
    Object.keys(layers).forEach(applyLayerStyle);
    Object.keys(markers).forEach(applyLayerStyle);
    renderLegend();
    renderRanking();
    renderStats();
    $('#view-note').textContent = modeLabel(state.mode);
  }

  function renderLegend() {
    const box = $('#legend');
    let rows = [];
    if (state.mode === 'spread') {
      rows = [0, 1, 2, 3].map((k) => ({
        color: SPREAD[k].color,
        label: T('spreadWord') + ' ' + k,
        sub: SPREAD[k][state.lang],
      }));
      rows.push({ color: '#e4e7ea', label: T('insufficient'), sub: T('noCompare') });
    } else {
      rows = [4, 3, 2, 1].map((k) => ({
        color: RISK[k].color,
        label: k + ' · ' + RISK[k][state.lang],
        sub: '',
      }));
      rows.push({ color: noDataColor(), label: T('nodataLegend'), sub: '' });
    }
    box.innerHTML = rows.map((r) =>
      '<div class="legend-row"><span class="legend-swatch" style="background:' + r.color + '"></span>' +
      '<span class="legend-label">' + esc(r.label) + '</span>' +
      (r.sub ? '<span class="legend-sub">' + esc(r.sub) + '</span>' : '') + '</div>'
    ).join('');
  }

  function renderRanking() {
    const list = state.data.countries
      .map((c) => ({ c, ...valueFor(c.iso2) }))
      .filter((x) => x.v > 0 || (state.mode === 'spread' && x.v === 0))
      .sort((a, b) => (b.v - a.v) || (b.agg.mean - a.agg.mean) || countryName(a.c).localeCompare(countryName(b.c)))
      .slice(0, 8);

    const title = state.mode === 'spread' ? T('rankSpread')
      : state.mode === 'max' ? T('rankStrict')
      : state.mode === 'agg' ? T('rankHigh') : T('rankSource');
    $('#rank-title').textContent = title;

    $('#ranking').innerHTML = list.map((x, i) => {
      const col = colorFor(x.v);
      return '<li class="rank-row" data-iso="' + x.c.iso2 + '">' +
        '<span class="rank-i">' + (i + 1) + '</span>' +
        cc(x.c.iso2, 'rank-cc') +
        '<span class="rank-name">' + esc(countryName(x.c)) + '<small>' + esc(otherName(x.c)) + '</small></span>' +
        '<span class="rank-bar"><i style="width:' + (state.mode === 'spread' ? (x.v / 3 * 100) : (x.v / 4 * 100)) + '%;background:' + col + '"></i></span>' +
        '<span class="rank-lv" style="color:' + col + '">' + (x.v > 0 ? x.v : '·') + '</span></li>';
    }).join('');

    $('#ranking').querySelectorAll('.rank-row').forEach((el) => {
      el.addEventListener('click', () => select(el.dataset.iso, true));
    });
  }

  function renderStats() {
    const withData = state.data.countries.filter((c) => aggFor(c).n > 0);
    const high = withData.filter((c) => aggFor(c).level >= 3).length;
    $('#stat-pills').innerHTML =
      '<div class="stat-pill"><b>' + withData.length + '</b> ' + esc(T('countriesSuffix')) + '</div>' +
      '<div class="stat-pill hide-sm"><span class="dot" style="background:' + RISK[4].color + '"></span>' + esc(T('statHigh')) + ' <b>' + high + '</b></div>' +
      '<div class="stat-pill hide-sm"><b>' + state.enabled.size + '</b> ' + esc(T('sourcesSuffix')) + '</div>';
  }

  // ----------------------------------------------------------------- detail
  function select(iso, fly) {
    if (!document.getElementById('search-panel').hidden) closeSearch();
    state.selected = iso;
    $('#modal').hidden = true;
    $('#detail').style.transform = '';
    Object.keys(layers).forEach(applyLayerStyle);
    Object.keys(markers).forEach(applyLayerStyle);
    renderDetail(iso);
    $('#detail').classList.add('open');
    $('#scrim').classList.add('show');
    $('#detail').setAttribute('aria-hidden', 'false');
    if (fly) flyTo(iso);
    history.replaceState(null, '', '#' + iso);
    if (window.innerWidth <= 980) $('#sidebar').classList.remove('open');
    syncOverlayState();
  }

  function flyTo(iso) {
    const c = state.byIso[iso];
    const centerLng = map.getCenter().lng;
    let best = null;
    let bestDist = Infinity;
    (layers[iso] || []).forEach((layer) => {
      const b = layer.getBounds();
      if (!b.isValid()) return;
      const d = Math.abs(b.getCenter().lng - centerLng);
      if (d < bestDist) { bestDist = d; best = b; }
    });
    if (best) {
      if (best.getNorth() - best.getSouth() < 0.4) {
        map.flyTo(best.getCenter(), 5, { duration: 0.9 });
      } else {
        map.flyToBounds(best.pad(0.45), { maxZoom: 5, duration: 0.9 });
      }
      return;
    }
    const points = markers[iso] || [];
    if (points.length) {
      const p = points.reduce((a, b) =>
        Math.abs(a.getLatLng().lng - centerLng) <= Math.abs(b.getLatLng().lng - centerLng) ? a : b);
      map.flyTo(p.getLatLng(), 4.5, { duration: 0.9 });
    } else if (c && c.lat) {
      map.flyTo([c.lat, c.lon], 4.5, { duration: 0.9 });
    }
  }

  function closeDetail() {
    state.selected = null;
    $('#detail').classList.remove('open');
    $('#detail').style.transform = '';
    $('#scrim').classList.remove('show');
    $('#detail').setAttribute('aria-hidden', 'true');
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    Object.keys(layers).forEach(applyLayerStyle);
    Object.keys(markers).forEach(applyLayerStyle);
    syncOverlayState();
  }

  // ------------------------------------------------------------- locate
  function toggleSidebar() {
    if (window.innerWidth <= 980) {
      $('#sidebar').classList.toggle('open');
      syncOverlayState();
      return;
    }
    document.body.classList.toggle('sidebar-collapsed');
    setTimeout(() => { if (map) map.invalidateSize(); }, 60);
    syncOverlayState();
  }

  function showToast(message) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  function pointInRing(lng, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      if (((yi > lat) !== (yj > lat)) &&
          (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  function polygonContains(polygon, lng, lat) {
    if (!polygon.length || !pointInRing(lng, lat, polygon[0])) return false;
    for (let h = 1; h < polygon.length; h += 1) {
      if (pointInRing(lng, lat, polygon[h])) return false;
    }
    return true;
  }

  function directCountry(lat, lng) {
    const features = (state.geo && state.geo.features) || [];
    for (let i = 0; i < features.length; i += 1) {
      const g = features[i].geometry;
      if (!g) continue;
      if (g.type === 'Polygon' && polygonContains(g.coordinates, lng, lat)) {
        return features[i].properties.iso2;
      }
      if (g.type === 'MultiPolygon') {
        for (let p = 0; p < g.coordinates.length; p += 1) {
          if (polygonContains(g.coordinates[p], lng, lat)) return features[i].properties.iso2;
        }
      }
    }
    return null;
  }

  function nearestPointState(lat, lng) {
    let best = null;
    let bestDist = Infinity;
    state.data.countries.forEach((c) => {
      if (c.has_geom || !c.lat || !c.lon) return;
      const dx = (lng - c.lon) * 111 * Math.cos((lat * Math.PI) / 180);
      const dy = (lat - c.lat) * 111;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = c; }
    });
    if (!best) return null;
    const radius = POINT_RADIUS_KM[best.iso2] || 15;
    return bestDist <= radius ? best.iso2 : null;
  }

  function countryAt(lat, lng) {
    // city-states / island states that the 110m polygons cannot represent
    const pointIso = nearestPointState(lat, lng);
    if (pointIso) return pointIso;

    const direct = directCountry(lat, lng);
    if (direct) return direct;

    // coastal cities can sit just outside the simplified coastline — sample nearby
    const offsets = [
      [0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35],
      [0.25, 0.25], [0.25, -0.25], [-0.25, 0.25], [-0.25, -0.25],
    ];
    const tally = {};
    offsets.forEach((off) => {
      const iso = directCountry(lat + off[0], lng + off[1]);
      if (iso) tally[iso] = (tally[iso] || 0) + 1;
    });
    let bestIso = null;
    let bestCount = 0;
    Object.keys(tally).forEach((iso) => {
      if (tally[iso] > bestCount) { bestCount = tally[iso]; bestIso = iso; }
    });
    return bestIso;
  }

  function placeUserMarker(lat, lng) {
    if (userMarker) map.removeLayer(userMarker);
    const centerLng = map.getCenter().lng;
    const adjusted = lng + Math.round((centerLng - lng) / 360) * 360;
    userMarker = L.circleMarker([lat, adjusted], {
      radius: 7, weight: 2.5, color: '#ffffff',
      fillColor: '#2f6b8f', fillOpacity: 1,
      bubblingMouseEvents: false,
      pane: 'pointsPane',
      renderer: pointsRenderer,
    }).addTo(map);
    userMarker.bindTooltip(T('yourLocation'), {
      className: 'risk-tip', direction: 'top', offset: [0, -6], opacity: 1,
    });
  }

  function locateUser() {
    if (!navigator.geolocation) {
      showToast(T('geoDenied'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        placeUserMarker(lat, lng);
        const iso = countryAt(lat, lng);
        if (iso && state.byIso[iso]) {
          select(iso, true);
        } else {
          closeDetail();
          map.flyTo([lat, lng], 4.5, { duration: 0.9 });
          showToast(T('geoNoCountry'));
        }
      },
      () => showToast(T('geoDenied')),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }

  function syncOverlayState() {
    const panel = document.getElementById('search-panel');
    const open = !document.getElementById('modal').hidden ||
      (panel && !panel.hidden) ||
      !!state.selected ||
      document.getElementById('sidebar').classList.contains('open') ||
      document.body.classList.contains('sidebar-collapsed');
    if (window.appBridge && typeof window.appBridge.setOverlay === 'function') {
      try { window.appBridge.setOverlay(open); } catch (e) { /* ignore */ }
    }
  }

  function renderDockResults(query) {
    const q = (query || '').trim().toLowerCase();
    const list = state.data.countries.filter((c) => !q ||
      c.name_zh.toLowerCase().includes(q) ||
      c.name_en.toLowerCase().includes(q) ||
      c.iso2.toLowerCase() === q
    ).slice(0, 12);
    const box = document.getElementById('dock-search-results');
    box.innerHTML = list.length ? list.map((c) => {
      const { v } = valueFor(c.iso2);
      const col = colorFor(v);
      return '<div class="sp-item" data-iso="' + c.iso2 + '">' + cc(c.iso2) +
        '<span class="nm">' + esc(countryName(c)) + ' <span class="en">' + esc(otherName(c)) + '</span></span>' +
        '<span class="lv" style="background:' + col + '">' + (v > 0 ? v : '·') + '</span></div>';
    }).join('') : '<div class="sp-empty">' + esc(T('noResults')) + '</div>';
    box.querySelectorAll('.sp-item').forEach((el) => {
      el.addEventListener('click', () => {
        const iso = el.dataset.iso;
        closeSearch();
        select(iso, true);
      });
    });
  }

  function openSearch() {
    document.getElementById('search-panel').hidden = false;
    document.getElementById('scrim').classList.add('show');
    document.getElementById('dock-search-input').value = '';
    renderDockResults('');
    setTimeout(() => {
      try { document.getElementById('dock-search-input').focus(); } catch (e) { /* ignore */ }
    }, 30);
    syncOverlayState();
  }

  function closeSearch() {
    document.getElementById('search-panel').hidden = true;
    if (!state.selected) document.getElementById('scrim').classList.remove('show');
    syncOverlayState();
  }

  window.__appBack = function () {
    if (!document.getElementById('modal').hidden) {
      document.getElementById('modal').hidden = true;
      syncOverlayState();
      return true;
    }
    if (!document.getElementById('search-panel').hidden) {
      closeSearch();
      return true;
    }
    if (state.selected) {
      closeDetail();
      return true;
    }
    if (document.getElementById('sidebar').classList.contains('open')) {
      document.getElementById('sidebar').classList.remove('open');
      syncOverlayState();
      return true;
    }
    if (document.body.classList.contains('sidebar-collapsed')) {
      document.body.classList.remove('sidebar-collapsed');
      setTimeout(() => { if (map) map.invalidateSize(); }, 60);
      syncOverlayState();
      return true;
    }
    return false;
  };

  function applyNewData(data, geo) {
    state.data = data;
    state.geo = geo;
    state.byIso = {};
    data.countries.forEach((c) => { state.byIso[c.iso2] = c; });

    worldCopies.forEach((arr, off) => removeWorldCopy(off));
    layers = {};
    markers = {};
    [-360, 0, 360].forEach(addWorldCopy);
    ensureWorldCopies();

    applyLanguage();
    renderGenerated();
    if (state.selected && state.byIso[state.selected]) {
      renderDetail(state.selected);
    } else {
      closeDetail();
    }
  }

  async function refreshRiskData(silent) {
    if (!REMOTE_DATA && !/^https?:$/.test(location.protocol)) {
      // packaged WebView without a remote endpoint: reload the bundled snapshot
      if (silent) return;
      showToast(T('dataUpdated'));
      setTimeout(() => location.reload(), 600);
      return;
    }
    if (!silent) showToast(T('refreshingData'));
    try {
      const previous = state.data && state.data.generated_at;
      const base = REMOTE_DATA || 'data/';
      const [riskRes, geoRes] = await Promise.all([
        fetch(base + 'risk.json?ts=' + Date.now(), { cache: 'no-store' }),
        fetch(base + 'countries.geojson?ts=' + Date.now(), { cache: 'no-store' }),
      ]);
      if (!riskRes.ok || !geoRes.ok) throw new Error('HTTP ' + riskRes.status);
      const data = await riskRes.json();
      const geo = await geoRes.json();
      applyNewData(data, geo);
      if (REMOTE_DATA) {
        try {
          localStorage.setItem(REMOTE_CACHE_KEY, JSON.stringify({ risk: data, geo: geo }));
          localStorage.setItem(REMOTE_FETCH_KEY, String(Date.now()));
        } catch (e) { /* cache full / private mode */ }
      }
      if (!silent || data.generated_at !== previous) showToast(T('dataUpdated'));
    } catch (e) {
      if (!silent) showToast(T('dataRefreshFailed'));
    }
  }

  function scheduleMidnightRefresh() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    const delay = Math.max(1000, next.getTime() - now.getTime());
    setTimeout(() => {
      if (navigator.onLine) refreshRiskData(true);
      scheduleMidnightRefresh();
    }, delay);
  }

  function riskSummary(c, agg) {
    if (!agg.n) return T('summaryNone');
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    SRC_ORDER.filter((id) => state.enabled.has(id) && c.sources[id])
      .forEach((id) => { counts[c.sources[id].level] += 1; });
    const actionsZh = { 4: '建议不要前往', 3: '建议重新考虑行程', 2: '建议提高警惕', 1: '建议保持正常防范' };
    const actionsEn = {
      4: 'advise against travel', 3: 'advise reconsidering travel',
      2: 'advise increased caution', 1: 'advise normal precautions',
    };
    const enAction = (n, l) => (n === 1 ? actionsEn[l].replace('advise', 'advises') : actionsEn[l]);
    const parts = [4, 3, 2, 1].filter((l) => counts[l]).map((l) => state.lang === 'zh'
      ? counts[l] + ' 个' + actionsZh[l]
      : counts[l] + ' ' + enAction(counts[l], l));
    return state.lang === 'zh'
      ? agg.n + ' 个来源中，' + parts.join('、') + '；最高 ' + agg.max + ' 级，分歧度 ' + agg.spread + '。'
      : 'Of ' + agg.n + ' source' + (agg.n === 1 ? '' : 's') + ', ' + parts.join(', ') +
        '; highest level ' + agg.max + ', spread ' + agg.spread + '.';
  }

  function emergencyHtml(em) {
    const header = '<div class="d-section"><span>' + esc(T('emergency')) + '</span><span>' +
      esc(T('localDial')) + '</span></div>';
    if (!em) {
      return header + '<div class="d-hero d-emerg"><div class="emerg-note">' +
        esc(T('noEmergency')) + '</div></div>';
    }
    const groups = new Map();
    [
      { k: T('police'), v: em.police },
      { k: T('ambulance'), v: em.ambulance },
      { k: T('fire'), v: em.fire },
      { k: T('dispatch'), v: em.dispatch },
    ].forEach((it) => {
      if (!it.v || !it.v.length) return;
      const key = it.v.join('|');
      if (!groups.has(key)) groups.set(key, { cats: [], nums: it.v });
      groups.get(key).cats.push(it.k);
    });
    const tiles = [...groups.values()].map((g) => ({
      k: g.cats.length >= 3 ? T('emergencyShort') : g.cats.join('/'),
      v: g.nums,
    }));
    if (!tiles.length) {
      return header + '<div class="d-hero d-emerg"><div class="emerg-note">' +
        esc(T('noEmergency')) + '</div></div>';
    }
    let html = header + '<div class="d-hero d-emerg"><div class="emerg-grid">' +
      tiles.map((t) => '<div class="emerg-cell"><span class="k">' + esc(t.k) + '</span><b>' +
        esc(t.v.join(' / ')) + '</b></div>').join('') + '</div></div>';
    if (em.notes) html += '<div class="emerg-note">' + esc(em.notes) + '</div>';
    html += '<div class="emerg-note">' + esc(T('emergencyNote')) + '</div>';
    return html;
  }

  function renderDetail(iso) {
    const body = $('#detail-body');
    const c = state.byIso[iso];
    if (!c) {
      body.innerHTML = '<div class="d-head"><div class="d-flag">🏳️</div><div class="d-title">' +
        '<h2>' + esc(iso) + '</h2><p>' + esc(T('noData')) + '</p></div></div>' +
        '<p class="d-note">' + esc(T('noDataDest')) + '</p>';
      return;
    }

    const agg = aggFor(c);
    const lv = agg.n ? agg.level : 0;
    const col = lv ? RISK[lv].color : noDataColor();
    const spread = agg.n >= 2 ? agg.spread : null;

    let html = '';
    html += '<div class="d-head"><div class="d-cc">' + esc(iso) + '</div><div class="d-title">' +
      '<h2>' + esc(countryName(c)) + '</h2><p>' + esc(otherName(c)) + (c.iso3 ? ' · ' + esc(c.iso3) : '') +
      (c.continent ? ' · ' + esc(continentName(c.continent)) : '') + '</p></div></div>';

    html += '<div class="d-hero">' +
      '<div class="d-level' + (lv ? '' : ' nodata') + '" style="background:' + col + '">' + (lv || '—') + '</div>' +
      '<div class="d-hero-txt"><div class="lvl" style="color:' + col + '">' +
      (lv ? T('levelWord') + ' ' + lv + ' · ' + RISK[lv][state.lang] : T('noData')) + '</div>' +
      '<div class="meta">' + (agg.n
        ? '<b>' + agg.n + '</b> ' + esc(T('sourcesWord')) + ' · ' + esc(T('median')) + ' <b>' + fmt(agg.median) +
          '</b> · ' + esc(T('mean')) + ' <b>' + agg.mean + '</b>'
        : esc(T('summaryNone'))) + '</div></div></div>';

    if (spread !== null) {
      const left = ((agg.min - 1) / 3) * 100;
      const width = ((agg.max - agg.min) / 3) * 100;
      html += '<div class="d-spread"><span class="spread-lbl">1</span>' +
        '<div class="spread-track"><div class="spread-fill" style="left:' + left + '%;width:' + Math.max(width, 2) + '%;background:' + (spread >= 2 ? RISK[3].color : RISK[2].color) + '"></div></div>' +
        '<span class="spread-lbl">4</span><span class="spread-lbl">' + esc(T('spreadWord')) + ' <b>' + spread + '</b></span></div>';
    }

    html += emergencyHtml(c.emergency);

    html += '<div class="d-section"><span>' + esc(T('official')) + '</span><span>' +
      SRC_ORDER.filter((id) => c.sources[id]).length + ' / ' + SRC_ORDER.length + '</span></div>';
    html += '<div class="src-list">';
    SRC_ORDER.forEach((id) => {
      const meta = state.data.sources[id];
      const s = c.sources[id];
      if (s) {
        const cc2 = RISK[s.level] ? RISK[s.level].color : '#9aa5ae';
        const label = state.lang === 'zh' ? s.label_zh : s.label_en;
        html += '<div class="src-card">' +
          '<div class="src-cc">' + esc(meta.short) + '</div>' +
          '<div class="src-main"><div class="top"><b>' + esc(srcName(id)) + '</b>' +
          '<span class="upd">' + (s.updated || '') + '</span></div>' +
          '<div class="lab">' + esc(label) +
          (s.partial && !/部分地区|some regions/.test(label) ? ' <span style="color:#9a6b2f">' + esc(T('partial')) + '</span>' : '') + '</div>' +
          (s.url ? '<a class="lnk" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(T('viewOfficial')) + '</a>' : '') +
          '</div>' +
          '<div class="src-badge" style="background:' + cc2 + '">' + s.level + '</div></div>';
      } else {
        html += '<div class="src-card missing">' +
          '<div class="src-cc">' + esc(meta.short) + '</div>' +
          '<div class="src-main"><div class="top"><b>' + esc(srcName(id)) + '</b></div>' +
          '<div class="lab">' + esc(T('missingSource')) + '</div></div>' +
          '<div class="src-badge none">—</div></div>';
      }
    });
    html += '</div>';

    // risk summary (language-consistent) + official excerpt in the same language
    let excerpt = '';
    let fromLabel = '';
    if (state.lang === 'zh' && state.enabled.has('cn') && c.sources.cn && c.sources.cn.summary) {
      excerpt = c.sources.cn.summary;
      fromLabel = T('cnAdviceFrom');
    } else if (state.lang === 'en' && state.enabled.has('us') && c.sources.us && c.sources.us.summary) {
      excerpt = c.sources.us.summary;
      fromLabel = T('usAdviceFrom');
    }
    html += '<div class="d-section"><span>' + esc(T('riskPoints')) + '</span></div>' +
      '<div class="summary-box"><p class="sumline">' + esc(riskSummary(c, agg)) + '</p>' +
      (excerpt ? '<div class="from">' + esc(fromLabel) + '</div><p class="excerpt">' + esc(excerpt) + '</p>' : '') +
      '</div>';

    html += '<p class="d-note">' + esc(T('detailNote')) + '</p>';

    body.innerHTML = html;
    body.scrollTop = 0;
  }

  // ------------------------------------------------------------------ modal
  function openModal() {
    if (!$('#search-panel').hidden) closeSearch();
    if (state.selected) closeDetail();
    const m = I18N[state.lang].modal;
    const s = state.data.sources;
    const total = state.data.countries.length;
    $('#modal-body').innerHTML =
      '<h2 id="modal-title">' + esc(m.title) + '</h2>' +
      '<p class="modal-sub">' + esc(m.intro) + '</p>' +
      '<h3>' + esc(m.sources) + '</h3>' +
      '<table class="src-table">' + SRC_ORDER.map((id) => {
        const meta = s[id];
        const n = state.data.countries.filter((c) => c.sources[id]).length;
        return '<tr><td>' + esc(meta.short) + '</td><td><b>' + esc(srcName(id)) + '</b><br>' +
          '<span style="color:#8b959e;font-size:11px">' + esc(m.perSource(n)) + '</span><br>' +
          '<a href="' + esc(meta.url) + '" target="_blank" rel="noopener">' + esc(meta.url) + '</a></td>' +
          '<td>' + esc(m.maxLevel) + '</td></tr>';
      }).join('') + '</table>' +
      '<h3>' + esc(m.normTitle) + '</h3><p>' + esc(m.normText) + '</p>' +
      '<h3>' + esc(m.aggTitle) + '</h3><ul>' + m.aggItems.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
      '<h3>' + esc(m.emergencyTitle) + '</h3><p>' + esc(m.emergencyText) + '</p>' +
      '<h3>' + esc(m.limitsTitle) + '</h3><ul>' + m.limits.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
      '<p class="modal-sub" style="margin-top:16px">' + esc(m.footer(prettyDate(state.data.generated_at))) + '</p>';
    $('#modal').hidden = false;
    syncOverlayState();
  }

  function renderGenerated() {
    $('#generated').textContent = T('generated')(prettyDate(state.data.generated_at), state.data.countries.length);
  }

  // ------------------------------------------------------------------ utils
  function T(key) {
    const v = I18N[state.lang][key];
    return v == null ? key : v;
  }

  function modeLabel(id) {
    if (id === 'agg') return T('modeAgg');
    if (id === 'max') return T('modeMax');
    if (id === 'spread') return T('modeSpread');
    if (state.lang === 'en') return SRC_SHORT_EN[id] || id;
    return srcName(id);
  }

  function srcName(id) {
    const meta = state.data.sources[id];
    if (!meta) return id;
    if (state.lang === 'zh') return meta.name_zh;
    return SRC_EN[id] || meta.name_en;
  }

  function countryName(c) {
    return state.lang === 'zh' ? c.name_zh : c.name_en;
  }

  function otherName(c) {
    return state.lang === 'zh' ? c.name_en : c.name_zh;
  }

  function continentName(c) {
    if (state.lang === 'en') return c;
    return ({
      Asia: '亚洲', Europe: '欧洲', Africa: '非洲', 'North America': '北美洲',
      'South America': '南美洲', Oceania: '大洋洲', Antarctica: '南极洲',
      'Seven seas (open ocean)': '公海',
    })[c] || c;
  }

  function fmt(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  function cc(iso, cls) {
    if (!iso) return '';
    return '<span class="cc ' + (cls || '') + '">' + esc(iso) + '</span>';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  function prettyDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso.slice(0, 10);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
})();
