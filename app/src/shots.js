// Vice Cover Studio — deterministic screenshot scenes.
// `?shot=cover&photo=pier&caption=Sunset%20Heist` loads a fixed sample
// photo and caption, paints once, then raises window.__shotReady so a
// screenshot tool can capture a reproducible frame. `shot=editor` leaves
// the editor UI visible with the photo loaded; `shot=cover` hides the
// editor chrome and shows only the cover canvas, at the requested size.

import { state } from './main.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot') || 'cover';
const photo = params.get('photo') || 'pier';
const caption = params.get('caption') || 'Sunset Heist';
const subtitle = params.get('subtitle') || 'A Vice Coast story';
const theme = params.get('theme') || 'sunset';
const layout = params.get('layout') || 'hero-split';
const sizeParam = params.get('size') || '1920x1080';

const SAMPLE_INDEX = { boulevard: 0, pier: 1 };

function parseSize(text) {
  const m = /^(\d+)x(\d+)$/.exec(text || '');
  if (!m) return { w: 1920, h: 1080 };
  return { w: Number(m[1]), h: Number(m[2]) };
}

async function paintScene() {
  state.title = caption;
  state.subtitle = subtitle;
  state.theme = theme in { sunset: 1, neon: 1, nights: 1 } ? theme : 'sunset';
  state.layout = layout in { 'hero-split': 1, grid: 1, 'hero-strip': 1 } ? layout : 'hero-split';

  const titleInput = document.getElementById('title-input');
  const subtitleInput = document.getElementById('subtitle-input');
  if (titleInput) titleInput.value = caption;
  if (subtitleInput) subtitleInput.value = subtitle;
  document.querySelectorAll('#theme-pick button').forEach((b) => {
    b.classList.toggle('active', b.dataset.theme === state.theme);
  });
  document.querySelectorAll('#layout-pick button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });

  const vc = window.__viceCover;
  const { w, h } = parseSize(sizeParam);
  vc.setExportSize(w, h);
  // Load the sample into every panel slot so all layouts are full.
  const idx = SAMPLE_INDEX[photo] ?? 1;
  await vc.loadSample(idx, 0);
  const other = idx === 0 ? 1 : 0;
  await vc.loadSample(other, 1);
  state.panels[0].photo = 0;
  state.panels[1].photo = 1;
  state.panels[2].photo = 0;
  state.panels[3].photo = 1;

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
  }
  vc.renderPreview();

  // Wait for the Anton face, then paint twice so the canvas is settled.
  try { await document.fonts.load('100px Anton'); } catch { /* fallback font */ }
  try { await document.fonts.ready; } catch { /* fallback font */ }
  vc.renderPreview();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  vc.renderPreview();
  window.__shotReady = true;
}

paintScene().catch((err) => {
  window.__shotError = String(err && err.message ? err.message : err);
});
