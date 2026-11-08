// ---------- Yardımcılar ----------

function encodeData(obj) {
  return btoa(encodeURIComponent(JSON.stringify(obj)));
}

function decodeData(str) {
  try {
    return JSON.parse(decodeURIComponent(atob(str)));
  } catch (e) {
    return null;
  }
}

const THEMES = {
  mixed: { stem: '#3f6b3a', petals: ['#e2493f', '#e8c15a', '#8b5fae', '#f3ece2', '#d98aa5'] },
  rose:  { stem: '#3f6b3a', petals: ['#c73550', '#e8637f', '#7a1f30', '#f3c9d2'] },
  tulip: { stem: '#3f6b3a', petals: ['#ff8fae', '#ffd1df', '#e85f8a', '#fff3f6'] },
  sun:   { stem: '#4f7a3a', petals: ['#ffd23f', '#ffb703', '#f4845f', '#fff6df'] }
};

// ---------- Arka plan yıldız tozu ----------

function spawnStars() {
  const layer = document.getElementById('starfield');
  if (!layer) return;
  const count = Math.min(60, Math.floor(window.innerWidth / 14));
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random() * 100 + 'vw';
    s.style.top = Math.random() * 100 + 'vh';
    s.style.animationDelay = (Math.random() * 3) + 's';
    s.style.animationDuration = (2.5 + Math.random() * 2.5) + 's';
    layer.appendChild(s);
  }
}

// ---------- Piksel / halftone buket üretimi ----------

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) || 1;
}

const SRC_W = 48, SRC_H = 66;
const BASE_X = SRC_W / 2, BASE_Y = SRC_H - 6;
const SPIKE_COUNT = 11;
const BLOB_COUNT = 30;
const CLUSTER_X = SRC_W / 2, CLUSTER_Y = SRC_H * 0.4;

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// Buketin sabit "modelini" (sap açıları, çiçek lekesi konum/renk/gecikmesi) üretir.
// Aynı tohumla her zaman aynı şekli verir; animasyon sırasında yeniden rastgelelenmez.
function buildBouquetModel(theme, seedStr) {
  const rnd = seededRandom(hashString(seedStr || 'bouquet'));

  const spikes = [];
  for (let i = 0; i < SPIKE_COUNT; i++) {
    const a = -Math.PI + (Math.PI / (SPIKE_COUNT - 1)) * i;
    spikes.push({
      angle: a,
      maxLen: 20 + rnd() * 14,
      delay: Math.abs(i - (SPIKE_COUNT - 1) / 2) / ((SPIKE_COUNT - 1) / 2) * 0.25
    });
  }

  const blobs = [];
  for (let i = 0; i < BLOB_COUNT; i++) {
    const ang = rnd() * Math.PI * 2;
    const distFrac = Math.sqrt(rnd());
    blobs.push({
      angle: ang,
      dist: distFrac * SRC_W * 0.34,
      maxR: 6 + rnd() * 8,
      color: theme.petals[Math.floor(rnd() * theme.petals.length)],
      delay: distFrac * 0.55
    });
  }

  return { theme, spikes, blobs };
}

// Modeli, sap (stemT) ve açılma (bloomT) ilerlemesine göre bir kaynak tuvale çizer.
function drawModelFrame(ctx, model, stemT, bloomT) {
  ctx.clearRect(0, 0, SRC_W, SRC_H);

  ctx.fillStyle = model.theme.stem;
  model.spikes.forEach((sp) => {
    const local = Math.max(0, Math.min(1, (stemT - sp.delay) / (1 - sp.delay)));
    const grown = easeOutCubic(local);
    if (grown <= 0) return;
    const len = sp.maxLen * grown;
    const x1 = BASE_X + Math.cos(sp.angle) * 2, y1 = BASE_Y + Math.sin(sp.angle) * 2;
    const x2 = BASE_X + Math.cos(sp.angle) * len, y2 = BASE_Y + Math.sin(sp.angle) * len * 0.85;
    const perp = sp.angle + Math.PI / 2;
    const spread = 2.1 * grown;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 + Math.cos(perp) * spread, y2 + Math.sin(perp) * spread);
    ctx.lineTo(x2 - Math.cos(perp) * spread, y2 - Math.sin(perp) * spread);
    ctx.closePath();
    ctx.fill();
  });

  if (bloomT <= 0) return;
  model.blobs.forEach((b) => {
    const local = Math.max(0, Math.min(1, (bloomT - b.delay) / (1 - b.delay)));
    if (local <= 0) return;
    const open = easeOutBack(local);
    const r = Math.max(0, b.maxR * Math.min(1, open));
    if (r <= 0.1) return;
    const dist = b.dist * Math.min(1, local * 1.15);
    const bx = CLUSTER_X + Math.cos(b.angle) * dist;
    const by = CLUSTER_Y + Math.sin(b.angle) * dist * 0.8;
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    g.addColorStop(0, b.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Kaynak tuvali, her pikseli bir noktaya çeviren halftone görünümüne render eder.
function renderHalftone(sourceCanvas, destCanvas, cell) {
  const W = sourceCanvas.width, H = sourceCanvas.height;
  const sctx = sourceCanvas.getContext('2d');
  const data = sctx.getImageData(0, 0, W, H).data;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  destCanvas.width = W * cell * dpr;
  destCanvas.height = H * cell * dpr;
  destCanvas.style.width = (W * cell) + 'px';
  destCanvas.style.height = (H * cell) + 'px';

  const dctx = destCanvas.getContext('2d');
  dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dctx.clearRect(0, 0, W * cell, H * cell);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const a = data[idx + 3] / 255;
      if (a < 0.06) continue;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const px = x * cell + cell / 2;
      const py = y * cell + cell / 2;
      const radius = (cell / 2) * Math.min(1, a) * 0.9;
      dctx.beginPath();
      dctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, a + 0.12)})`;
      dctx.arc(px, py, radius, 0, Math.PI * 2);
      dctx.fill();
    }
  }
}

// Sapı büyüten, ardından çiçeği açan canlı animasyon. Her çağrıda baştan oynar.
function animateBouquet(canvas, themeKey, seedStr, cell, opts) {
  opts = opts || {};
  const duration = opts.duration || 2600;
  const theme = THEMES[themeKey] || THEMES.mixed;
  const model = buildBouquetModel(theme, seedStr);

  const source = document.createElement('canvas');
  source.width = SRC_W;
  source.height = SRC_H;
  const sctx = source.getContext('2d');

  if (canvas._bouquetRaf) cancelAnimationFrame(canvas._bouquetRaf);
  canvas.classList.remove('idle-breathe');

  let start = null;
  function frame(ts) {
    if (start === null) start = ts;
    const t = Math.min(1, (ts - start) / duration);
    const stemT = easeOutCubic(Math.min(1, t / 0.42));
    const bloomT = Math.max(0, Math.min(1, (t - 0.32) / 0.68));

    drawModelFrame(sctx, model, stemT, bloomT);
    renderHalftone(source, canvas, cell);

    if (t < 1) {
      canvas._bouquetRaf = requestAnimationFrame(frame);
    } else {
      canvas._bouquetRaf = null;
      canvas.classList.add('idle-breathe');
      if (opts.onDone) opts.onDone();
    }
  }
  canvas._bouquetRaf = requestAnimationFrame(frame);
}

// ---------- Oluşturma ekranı ----------

function currentTheme(form) {
  const checked = form.querySelector('input[name="theme"]:checked');
  return checked ? checked.value : 'mixed';
}

function initCreateScreen() {
  const form = document.getElementById('bouquetForm');
  if (!form) return;

  const previewCanvas = document.getElementById('previewCanvas');
  const previewForLine = document.getElementById('previewForLine');
  const toInput = document.getElementById('toName');

  function updatePreview() {
    const theme = currentTheme(form);
    animateBouquet(previewCanvas, theme, 'preview-' + theme, 7, { duration: 2000 });
  }

  function updateForLine() {
    const name = toInput.value.trim();
    previewForLine.textContent = name ? `${name} için` : 'senin için';
  }

  form.querySelectorAll('input[name="theme"]').forEach((r) =>
    r.addEventListener('change', updatePreview)
  );
  toInput.addEventListener('input', updateForLine);

  updatePreview();
  updateForLine();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const to = document.getElementById('toName').value.trim();
    const from = document.getElementById('fromName').value.trim();
    const message = document.getElementById('message').value.trim();
    const theme = currentTheme(form);

    if (!to) return;

    const data = encodeData({ to, from, message, theme });
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('data', data);

    const shareLink = document.getElementById('shareLink');
    shareLink.value = url.toString();
    document.getElementById('previewLink').href = url.toString();
    document.getElementById('linkBox').classList.remove('hidden');
    document.getElementById('linkBox').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('copyBtn').addEventListener('click', async () => {
    const input = document.getElementById('shareLink');
    try {
      await navigator.clipboard.writeText(input.value);
    } catch (e) {
      input.select();
      document.execCommand('copy');
    }
    const btn = document.getElementById('copyBtn');
    const old = btn.textContent;
    btn.textContent = 'Kopyalandı ✓';
    setTimeout(() => (btn.textContent = old), 1600);
  });
}

// ---------- Sunum ekranı ----------

function typeText(el, text, speed = 32) {
  el.textContent = '';
  let i = 0;
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      el.textContent += text[i];
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        resolve();
      }
    }, speed);
  });
}

async function initPresentScreen(data) {
  document.getElementById('createScreen').classList.add('hidden');
  document.getElementById('presentScreen').classList.remove('hidden');

  document.getElementById('toLine').textContent = `${data.to} için`;

  const canvas = document.getElementById('presentCanvas');
  animateBouquet(canvas, data.theme, 'present-' + data.to, 9, { duration: 3200 });

  if (data.message || data.from) {
    setTimeout(async () => {
      const card = document.getElementById('messageCard');
      card.classList.remove('hidden');
      if (data.message) {
        await typeText(document.getElementById('msgLine'), data.message);
      } else {
        document.getElementById('msgLine').remove();
      }
      document.getElementById('fromLine').textContent = data.from ? `— ${data.from}` : '';
    }, 2200);
  }
}

// ---------- Başlat ----------

function main() {
  spawnStars();
  initCreateScreen();

  const params = new URLSearchParams(window.location.search);
  const raw = params.get('data');
  if (raw) {
    const data = decodeData(raw);
    if (data && data.to) {
      initPresentScreen(data);
      return;
    }
  }
}

document.addEventListener('DOMContentLoaded', main);
