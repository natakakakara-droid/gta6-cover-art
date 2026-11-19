// Vice Cover Studio — page wiring.
// Owns the editor state, the preview canvas, the panel controls, the file
// input and the PNG exports. All photos are read client-side only.

import { THEMES, LAYOUTS, EXPORT_SIZES, drawCover, panelRectAt, panelCount } from './cover.js';

const $ = (id) => document.getElementById(id);

const SAMPLES = [
  { name: 'Boulevard', file: 'samples/boulevard.jpg' },
  { name: 'Pier', file: 'samples/pier.jpg' },
];

// Editor state. `photos` holds up to 3 loaded images (or null slots).
// `panels` holds one transform per panel slot of the widest layout (4).
export const state = {
  photos: [null, null, null],
  photoNames: ['', '', ''],
  layout: 'hero-split',
  theme: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'A Vice Coast story',
  warmth: 0.7,
  activePanel: 0,
  panels: [
    { photo: 0, zoom: 1, ox: 0, oy: 0, fit: 'fill' },
    { photo: 1, zoom: 1, ox: 0, oy: 0, fit: 'fill' },
    { photo: 2, zoom: 1, ox: 0, oy: 0, fit: 'fill' },
    { photo: 0, zoom: 1, ox: 0, oy: 0, fit: 'fill' },
  ],
};

export let exportSize = EXPORT_SIZES[2]; // 1920 x 1080 by default.

const canvas = $('preview');
const statusEl = $('status');

function setStatus(text) {
  statusEl.textContent = text;
}

function renderPreview() {
  const w = exportSize.w;
  const h = exportSize.h;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d');
  drawCover(ctx, w, h, state);
  if (!document.body.classList.contains('shot-cover')) highlightActivePanel();
}

function highlightActivePanel() {
  const n = panelCount(state.layout);
  if (state.activePanel >= n) state.activePanel = 0;
  const rect = panelRectAt(canvas.width, canvas.height, state.layout, state.activePanel);
  if (!rect) return;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.setLineDash([14, 10]);
  ctx.lineWidth = 4;
  ctx.strokeRect(rect.x + 3, rect.y + 3, rect.w - 6, rect.h - 6);
  ctx.restore();
}

function activeTransform() {
  return state.panels[state.activePanel];
}

function syncPanelControls() {
  const t = activeTransform();
  $('panel-photo').value = String(t.photo);
  $('panel-zoom').value = String(t.zoom);
  $('panel-zoom-value').textContent = `${Math.round(t.zoom * 100)}%`;
  $('panel-fit').checked = t.fit === 'fit';
  $('active-panel-label').textContent = `Panel ${state.activePanel + 1} of ${panelCount(state.layout)}`;
  document.querySelectorAll('#panel-pick button').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.panel) === state.activePanel);
  });
}

function syncPhotoSlots() {
  state.photos.forEach((img, i) => {
    const slot = $(`slot-${i}`);
    slot.textContent = img ? `Photo ${i + 1}: ${state.photoNames[i]}` : `Photo ${i + 1}: empty`;
    slot.classList.toggle('loaded', Boolean(img));
  });
}

function loadImageFile(file, slot) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        state.photos[slot] = img;
        state.photoNames[slot] = file.name || `photo-${slot + 1}`;
        syncPhotoSlots();
        renderPreview();
        resolve(img);
      };
      img.onerror = () => reject(new Error('That file is not a readable image.'));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function loadSample(index, slot) {
  const sample = SAMPLES[index];
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      state.photos[slot] = img;
      state.photoNames[slot] = sample.name;
      syncPhotoSlots();
      renderPreview();
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Could not load sample ${sample.file}.`));
    img.src = sample.file;
  });
}

function firstEmptySlot() {
  const i = state.photos.indexOf(null);
  return i === -1 ? 0 : i;
}

// Render a cover at exact export size and return a PNG blob.
export function exportPNG(w, h) {
  return new Promise((resolve, reject) => {
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    drawCover(off.getContext('2d'), w, h, state);
    off.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG export failed.'));
    }, 'image/png');
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function slug(text) {
  return (text || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
}

async function exportOne(size) {
  setStatus(`Exporting ${size.label}…`);
  const blob = await exportPNG(size.w, size.h);
  downloadBlob(blob, `${slug(state.title)}-${size.w}x${size.h}.png`);
  setStatus(`Exported ${size.label} PNG (${Math.round(blob.size / 1024)} KB).`);
  return blob;
}

async function exportAll() {
  for (const size of EXPORT_SIZES) {
    // eslint-disable-next-line no-await-in-loop
    await exportOne(size);
  }
  setStatus('Exported all three sizes: 1080x1080, 1080x1350, 1920x1080.');
}

// Drag a photo inside its panel to reposition it.
function wireDrag() {
  let drag = null;
  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    const n = panelCount(state.layout);
    for (let i = 0; i < n; i += 1) {
      const rect = panelRectAt(canvas.width, canvas.height, state.layout, i);
      if (rect && p.x >= rect.x && p.x <= rect.x + rect.w && p.y >= rect.y && p.y <= rect.y + rect.h) {
        state.activePanel = i;
        syncPanelControls();
        drag = { panel: i, startX: p.x, startY: p.y, ox: state.panels[i].ox, oy: state.panels[i].oy, rect };
        canvas.setPointerCapture(e.pointerId);
        renderPreview();
        break;
      }
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = toCanvas(e);
    const t = state.panels[drag.panel];
    t.ox = drag.ox + (p.x - drag.startX) / drag.rect.w;
    t.oy = drag.oy + (p.y - drag.startY) / drag.rect.h;
    renderPreview();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });
}

function buildPickers() {
  const layoutBox = $('layout-pick');
  Object.entries(LAYOUTS).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.label;
    b.dataset.layout = key;
    b.classList.toggle('active', key === state.layout);
    b.addEventListener('click', () => {
      state.layout = key;
      state.activePanel = 0;
      document.querySelectorAll('#layout-pick button').forEach((x) => x.classList.toggle('active', x === b));
      syncPanelControls();
      renderPreview();
    });
    layoutBox.appendChild(b);
  });

  const themeBox = $('theme-pick');
  Object.entries(THEMES).forEach(([key, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = def.label;
    b.dataset.theme = key;
    b.classList.toggle('active', key === state.theme);
    b.addEventListener('click', () => {
      state.theme = key;
      document.querySelectorAll('#theme-pick button').forEach((x) => x.classList.toggle('active', x === b));
      renderPreview();
    });
    themeBox.appendChild(b);
  });

  const sizeBox = $('size-pick');
  EXPORT_SIZES.forEach((size) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = size.label;
    b.dataset.size = `${size.w}x${size.h}`;
    b.classList.toggle('active', size === exportSize);
    b.addEventListener('click', () => {
      exportSize = size;
      document.querySelectorAll('#size-pick button').forEach((x) => x.classList.toggle('active', x === b));
      renderPreview();
    });
    sizeBox.appendChild(b);
  });

  const panelBox = $('panel-pick');
  for (let i = 0; i < 4; i += 1) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Panel ${i + 1}`;
    b.dataset.panel = String(i);
    b.addEventListener('click', () => {
      state.activePanel = i;
      syncPanelControls();
      renderPreview();
    });
    panelBox.appendChild(b);
  }

  const sampleBox = $('sample-pick');
  SAMPLES.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Load ${s.name}`;
    b.addEventListener('click', async () => {
      try {
        await loadSample(i, firstEmptySlot());
        setStatus(`${s.name} loaded. Drag it inside a panel to reposition.`);
      } catch (err) {
        setStatus(err.message);
      }
    });
    sampleBox.appendChild(b);
  });
}

function wireControls() {
  $('photo-input').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop
      try {
        await loadImageFile(file, firstEmptySlot());
        setStatus(`${file.name} loaded.`);
      } catch (err) {
        setStatus(err.message);
      }
    }
    e.target.value = '';
  });

  $('title-input').addEventListener('input', (e) => {
    state.title = e.target.value;
    renderPreview();
  });
  $('subtitle-input').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    renderPreview();
  });

  $('warmth').addEventListener('input', (e) => {
    state.warmth = Number(e.target.value);
    $('warmth-value').textContent = `${Math.round(state.warmth * 100)}%`;
    renderPreview();
  });

  $('panel-photo').addEventListener('change', (e) => {
    activeTransform().photo = Number(e.target.value);
    renderPreview();
  });
  $('panel-zoom').addEventListener('input', (e) => {
    activeTransform().zoom = Number(e.target.value);
    $('panel-zoom-value').textContent = `${Math.round(activeTransform().zoom * 100)}%`;
    renderPreview();
  });
  $('panel-fit').addEventListener('change', (e) => {
    activeTransform().fit = e.target.checked ? 'fit' : 'fill';
    renderPreview();
  });
  $('panel-reset').addEventListener('click', () => {
    const t = activeTransform();
    t.zoom = 1;
    t.ox = 0;
    t.oy = 0;
    t.fit = 'fill';
    syncPanelControls();
    renderPreview();
  });

  $('export-one').addEventListener('click', async () => {
    try { await exportOne(exportSize); } catch (err) { setStatus(err.message); }
  });
  $('export-all').addEventListener('click', async () => {
    try { await exportAll(); } catch (err) { setStatus(err.message); }
  });
}

// Test hooks: the verification script uses these to drive exports and
// screenshots without touching the DOM.
window.__viceCover = {
  state,
  renderPreview,
  exportPNG,
  loadSample,
  loadImageFile,
  setExportSize(w, h) {
    const found = EXPORT_SIZES.find((s) => s.w === w && s.h === h);
    if (found) exportSize = found;
    renderPreview();
  },
};

export function init() {
  buildPickers();
  wireControls();
  wireDrag();
  syncPhotoSlots();
  syncPanelControls();
  renderPreview();
  setStatus('Ready — load a photo or a sample, then export a PNG.');
}

init();
