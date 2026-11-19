// Vice Cover Studio — cover renderer.
// Draws the whole cover on a canvas: a procedural Vice sunset backdrop
// (gradient sky, striped sun disc, skyline with lit windows, palm
// silhouettes, grain, vignette) plus multi-panel photo panels and bold
// condensed caption lettering. Everything is drawn in code; no borrowed art.
// Photos are supplied by the caller as HTMLImageElements and never leave
// the machine.

export const THEMES = {
  sunset: {
    label: 'Sunset',
    skyTop: '#2b1055',
    skyMid: '#ff5e62',
    skyLow: '#ff9a3d',
    sunCore: '#ffe259',
    sunEdge: '#ff7518',
    skyline: '#1a0b2e',
    window: '#ffd166',
    accent: '#ff9a3d',
    accent2: '#ff5e62',
    grade: 'rgba(255, 94, 98, 0.16)',
    scrim: 'rgba(26, 11, 46, 0.72)',
  },
  neon: {
    label: 'Neon',
    skyTop: '#0b1035',
    skyMid: '#7b2ff7',
    skyLow: '#00e5ff',
    sunCore: '#f5f0ff',
    sunEdge: '#ff2ec4',
    skyline: '#0a0618',
    window: '#00e5ff',
    accent: '#00e5ff',
    accent2: '#ff2ec4',
    grade: 'rgba(0, 229, 255, 0.14)',
    scrim: 'rgba(10, 6, 24, 0.72)',
  },
  nights: {
    label: 'Vice Nights',
    skyTop: '#12082e',
    skyMid: '#5b2a86',
    skyLow: '#c94b7c',
    sunCore: '#ffd9a0',
    sunEdge: '#c94b7c',
    skyline: '#0d0518',
    window: '#ffb347',
    accent: '#c94b7c',
    accent2: '#7b5cff',
    grade: 'rgba(123, 92, 255, 0.16)',
    scrim: 'rgba(13, 5, 24, 0.72)',
  },
};

// Panel rectangles in normalised cover coordinates (x, y, w, h), gap-aware.
export const LAYOUTS = {
  'hero-split': {
    label: 'Hero Split',
    panels: [
      { x: 0.0, y: 0.0, w: 0.62, h: 1.0 },
      { x: 0.64, y: 0.0, w: 0.36, h: 0.49 },
      { x: 0.64, y: 0.51, w: 0.36, h: 0.49 },
    ],
  },
  grid: {
    label: 'Four Grid',
    panels: [
      { x: 0.0, y: 0.0, w: 0.49, h: 0.49 },
      { x: 0.51, y: 0.0, w: 0.49, h: 0.49 },
      { x: 0.0, y: 0.51, w: 0.49, h: 0.49 },
      { x: 0.51, y: 0.51, w: 0.49, h: 0.49 },
    ],
  },
  'hero-strip': {
    label: 'Hero Strip',
    panels: [
      { x: 0.0, y: 0.0, w: 1.0, h: 0.68 },
      { x: 0.0, y: 0.7, w: 0.32, h: 0.3 },
      { x: 0.34, y: 0.7, w: 0.32, h: 0.3 },
      { x: 0.68, y: 0.7, w: 0.32, h: 0.3 },
    ],
  },
};

export const EXPORT_SIZES = [
  { label: '1080 x 1080', w: 1080, h: 1080 },
  { label: '1080 x 1350', w: 1080, h: 1350 },
  { label: '1920 x 1080', w: 1920, h: 1080 },
];

// Deterministic pseudo-random generator so the grain and skyline are stable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawSky(ctx, W, H, theme) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, theme.skyTop);
  sky.addColorStop(0.45, theme.skyMid);
  sky.addColorStop(0.8, theme.skyLow);
  sky.addColorStop(1, theme.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
}

function drawSun(ctx, W, H, theme, cx, cy, r) {
  const sun = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
  sun.addColorStop(0, theme.sunCore);
  sun.addColorStop(0.7, theme.sunEdge);
  sun.addColorStop(1, theme.sunEdge);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = sun;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Retro slats across the lower half of the disc.
  ctx.fillStyle = theme.skyMid;
  let y = cy + r * 0.05;
  let gap = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap * 2.4;
    gap *= 1.5;
  }
  ctx.restore();
  // Glow halo.
  const halo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 2.1);
  halo.addColorStop(0, theme.sunEdge + '55');
  halo.addColorStop(1, theme.sunEdge + '00');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);
}

function drawSkyline(ctx, W, H, theme, rng, base, maxH) {
  ctx.fillStyle = theme.skyline;
  let x = 0;
  const buildings = [];
  while (x < W) {
    const bw = W * (0.05 + rng() * 0.07);
    const bh = H * 0.02 + rng() * maxH;
    buildings.push({ x, w: bw, h: bh });
    ctx.fillRect(x, base - bh, bw, bh);
    x += bw + W * 0.008;
  }
  // Lit windows.
  ctx.fillStyle = theme.window;
  for (const b of buildings) {
    const cols = Math.max(1, Math.floor(b.w / (W * 0.018)));
    const rows = Math.max(1, Math.floor(b.h / (H * 0.035)));
    for (let c = 0; c < cols; c += 1) {
      for (let r = 0; r < rows; r += 1) {
        if (rng() < 0.42) {
          const wx = b.x + W * 0.008 + c * (W * 0.018);
          const wy = base - b.h + H * 0.012 + r * (H * 0.035);
          ctx.globalAlpha = 0.55 + rng() * 0.45;
          ctx.fillRect(wx, wy, W * 0.008, H * 0.014);
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawPalm(ctx, x, baseY, s, lean, theme) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(lean);
  ctx.scale(s, s);
  ctx.strokeStyle = theme.skyline;
  ctx.fillStyle = theme.skyline;
  ctx.lineCap = 'round';
  // Trunk.
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -60, 2, -118);
  ctx.stroke();
  // Fronds.
  ctx.lineWidth = 5;
  const tipX = 2;
  const tipY = -118;
  for (let i = 0; i < 7; i += 1) {
    const a = (-Math.PI * 0.95 * i) / 6 - Math.PI * 0.02;
    const len = 52 - Math.abs(i - 3) * 5;
    const ex = tipX + Math.cos(a) * len;
    const ey = tipY + Math.sin(a) * len * 0.55 + 26;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(tipX + Math.cos(a) * len * 0.5, tipY - 14, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPalms(ctx, W, H, theme, base, scale) {
  const s = (Math.min(W, H) / 900) * scale;
  drawPalm(ctx, W * 0.06, base, s * 1.15, -0.06, theme);
  drawPalm(ctx, W * 0.94, base, s * 1.0, 0.08, theme);
  drawPalm(ctx, W * 0.84, base, s * 0.6, 0.05, theme);
}

function drawGrain(ctx, W, H, rng) {
  const count = Math.floor((W * H) / 900);
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const x = rng() * W;
    const y = rng() * H;
    ctx.globalAlpha = 0.03 + rng() * 0.05;
    ctx.fillStyle = rng() < 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// Draw one photo into a panel rect, honouring zoom / offsets / fit.
export function drawPhotoPanel(ctx, img, rect, transform) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#14081f';
  ctx.fillRect(x, y, w, h);
  if (img) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    let scale = transform.fit === 'fit'
      ? Math.min(w / iw, h / ih)
      : Math.max(w / iw, h / ih);
    scale *= transform.zoom || 1;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = x + (w - dw) / 2 + (transform.ox || 0) * w;
    const dy = y + (h - dh) / 2 + (transform.oy || 0) * h;
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  ctx.restore();
  // Panel frame: a crisp white keyline, like a poster panel.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.008);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

// Bold condensed caption with outline, shadow and a slight skew.
function drawCaption(ctx, W, H, theme, title, subtitle, warmth) {
  const pad = W * 0.045;
  const maxW = W - pad * 2;
  const baseY = H * 0.88;
  ctx.save();
  // Scrim so the lettering always reads over any photo.
  const scrim = ctx.createLinearGradient(0, H * 0.79, 0, H);
  scrim.addColorStop(0, 'rgba(0,0,0,0)');
  scrim.addColorStop(1, theme.scrim);
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.79, W, H * 0.21);

  const skew = -0.07;
  let size = Math.min(W * 0.13, H * 0.16);
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  const text = (title || 'Sunset Heist').toUpperCase().slice(0, 40);
  while (size > W * 0.03 && ctx.measureText(text).width > maxW) {
    size *= 0.94;
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  }
  // Skew around the text origin so the title stays left-aligned.
  ctx.save();
  ctx.translate(pad, baseY);
  ctx.transform(1, 0, skew, 1, 0, 0);
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.06;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160a24';
  ctx.lineWidth = size * 0.14;
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(pad, baseY);
  ctx.transform(1, 0, skew, 1, 0, 0);

  // Accent underline bar.
  const barW = Math.min(maxW, ctx.measureText(text).width * 0.62);
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, size * 0.16, barW, Math.max(4, size * 0.07));
  ctx.fillStyle = theme.accent2;
  ctx.fillRect(barW, size * 0.16, Math.max(6, size * 0.16), Math.max(4, size * 0.07));

  // Subtitle / tagline.
  const sub = (subtitle || '').toUpperCase().slice(0, 60);
  if (sub) {
    const subSize = Math.max(12, size * 0.24);
    ctx.font = `700 ${subSize}px 'Arial Narrow', Arial, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, subSize * 0.22)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = '#ffe9c9';
    ctx.fillText(sub, 0, size * 0.14 + subSize * 1.6);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
  ctx.restore();

  // Warmth tint over the whole cover.
  if (warmth > 0) {
    ctx.save();
    ctx.globalAlpha = warmth * 0.35;
    ctx.fillStyle = theme.grade;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// Cover geometry: a sunset art band across the top, the photo panels in
// the middle, and the caption zone at the bottom. The procedural art stays
// visible instead of hiding behind the panels.
export const BAND_H = 0.16; // top art band, fraction of cover height
export const TITLE_TOP = 0.8; // caption zone starts here
export const MARGIN = 0.015; // side margin, fraction of cover width

// Panel rects in canvas pixels. The layout's normalised panels are mapped
// into the panel area between the art band and the caption zone.
export function layoutRects(W, H, layoutName) {
  const layout = LAYOUTS[layoutName] || LAYOUTS['hero-split'];
  const gap = Math.round(Math.min(W, H) * 0.012);
  const areaX = MARGIN * W;
  const areaY = BAND_H * H;
  const areaW = W - 2 * MARGIN * W;
  const areaH = (TITLE_TOP - BAND_H) * H;
  return layout.panels.map((p) => ({
    x: Math.round(areaX + p.x * areaW) + (p.x > 0 ? gap / 2 : 0),
    y: Math.round(areaY + p.y * areaH) + (p.y > 0 ? gap / 2 : 0),
    w: Math.round(p.w * areaW) - (p.x > 0 ? gap / 2 : 0) - (p.x + p.w < 1 ? gap / 2 : 0),
    h: Math.round(p.h * areaH) - (p.y > 0 ? gap / 2 : 0) - (p.y + p.h < 1 ? gap / 2 : 0),
  }));
}

// Full cover render. `state` holds photos, layout, theme, caption and
// per-panel transforms. `photos` is an array of HTMLImageElement|null.
export function drawCover(ctx, W, H, state) {
  const theme = THEMES[state.theme] || THEMES.sunset;
  const rng = mulberry32(20261119);
  const warmth = typeof state.warmth === 'number' ? state.warmth : 0.7;
  const bandH = BAND_H * H;

  drawSky(ctx, W, H, theme);
  // Sunset art band: big striped sun, skyline silhouette, palms.
  drawSun(ctx, W, H, theme, W * 0.5, bandH * 0.62, Math.min(W, H) * 0.11);
  drawSkyline(ctx, W, H, theme, rng, bandH, H * 0.09);
  drawPalms(ctx, W, H, theme, bandH, 0.55);

  // Photo panels on top of the backdrop.
  layoutRects(W, H, state.layout).forEach((rect, i) => {
    const t = (state.panels && state.panels[i]) || { photo: 0, zoom: 1, ox: 0, oy: 0, fit: 'fill' };
    const img = state.photos ? state.photos[t.photo] : null;
    drawPhotoPanel(ctx, img, rect, t);
    // Theme grade inside each panel.
    ctx.save();
    ctx.globalAlpha = 0.5 + warmth * 0.3;
    ctx.fillStyle = theme.grade;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  });

  drawGrain(ctx, W, H, rng);
  drawVignette(ctx, W, H);
  drawCaption(ctx, W, H, theme, state.title, state.subtitle, warmth);

  // Outer accent frame.
  ctx.save();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = Math.max(3, Math.min(W, H) * 0.006);
  ctx.strokeRect(
    ctx.lineWidth / 2, ctx.lineWidth / 2,
    W - ctx.lineWidth, H - ctx.lineWidth,
  );
  ctx.restore();
}

// Panel rect in canvas pixels, for hit-testing the preview.
export function panelRectAt(W, H, layoutName, index) {
  const rects = layoutRects(W, H, layoutName);
  return rects[index] || null;
}

export function panelCount(layoutName) {
  const layout = LAYOUTS[layoutName] || LAYOUTS['hero-split'];
  return layout.panels.length;
}
