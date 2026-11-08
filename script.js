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
  mixed: {
    stem: '#3f6b3a',
    flowerColors: ['#e2493f', '#e8c15a', '#8b5fae', '#f3ece2', '#d98aa5'],
    centers: ['#8f1d3a', '#6b3f1d', '#4a2a63', '#caa7b0', '#8f1d3a'],
    flat: false
  },
  rose: {
    stem: '#3f6b3a',
    flowerColors: ['#e0355b', '#ff6b89', '#c43e68', '#ff85a1', '#e0355b'],
    centers: ['#7a1f30'],
    flat: false
  },
  tulip: {
    stem: '#3f6b3a',
    flowerColors: ['#ff8fae', '#ffc1d9', '#ff6fa0', '#ffd6e5', '#ff8fae'],
    centers: ['#d94f82'],
    flat: false
  },
  sun: {
    stem: '#4f7a3a',
    flowerColors: ['#ffd23f', '#ffb703', '#f4a300', '#ffcf4d', '#ffd23f'],
    centers: ['#6b3f1d'],
    flat: true
  }
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

// Referans kutu: düzen sayıları bu 300x380 alana göre ayarlandı, her çizimde
// hedef tuvalin gerçek W/H'ine ölçeklenir.
const REF_W = 300, REF_H = 380;
const LAYOUT = [
  { x: -70, h: 150, size: 60 },
  { x: -35, h: 190, size: 68 },
  { x: 0, h: 210, size: 76 },
  { x: 35, h: 190, size: 68 },
  { x: 70, h: 150, size: 60 }
];

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// Buketin sabit "modelini" (sap/çiçek konumları, renkleri, gecikmeleri) üretir.
// Aynı tohumla her zaman aynı şekli verir; animasyon sırasında yeniden rastgelelenmez.
function buildBouquetModel(theme, seedStr, W, H) {
  const rnd = seededRandom(hashString(seedStr || 'bouquet'));
  const sx = W / REF_W, sy = H / REF_H;
  const s = Math.min(sx, sy);
  const baseY = H - 54 * sy;

  const flowers = LAYOUT.map((f, i) => {
    const jitter = (rnd() - 0.5) * 6 * sx;
    return {
      x: W / 2 + f.x * sx + jitter,
      baseY,
      topY: baseY - f.h * sy,
      size: f.size * s,
      color: theme.flowerColors[i % theme.flowerColors.length],
      center: theme.centers[i % theme.centers.length],
      delay: (i / (LAYOUT.length - 1)) * 0.35,
      petalCount: theme.flat ? 11 : 6,
      flat: theme.flat
    };
  });

  return { theme, flowers, scale: s };
}

function drawFlowerHead(ctx, f, open, headY) {
  const petalLen = f.size * 0.52;
  const petalWidth = f.size * (f.flat ? 0.16 : 0.34);

  for (let j = 0; j < f.petalCount; j++) {
    const angle = (Math.PI * 2 / f.petalCount) * j;
    const twist = (1 - open) * 0.8 * (j % 2 === 0 ? 1 : -1);
    ctx.save();
    ctx.translate(f.x, headY);
    ctx.rotate(angle + twist);
    ctx.scale(open, open);
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.ellipse(0, -petalLen * 0.52, petalWidth / 2, petalLen * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(f.x, headY);
  ctx.scale(open, open);
  ctx.fillStyle = f.center;
  ctx.beginPath();
  ctx.arc(0, 0, f.size * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLeaf(ctx, x, y, s, dir, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(dir > 0 ? -0.5 : Math.PI + 0.5);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Modeli, sap (stemT) ve açılma (bloomT) ilerlemesine göre tuvale çizer.
function drawModelFrame(ctx, model, W, H, stemT, bloomT) {
  ctx.clearRect(0, 0, W, H);
  const grownStem = easeOutCubic(stemT);

  model.flowers.forEach((f) => {
    const curTopY = f.baseY - (f.baseY - f.topY) * grownStem;

    ctx.strokeStyle = model.theme.stem;
    ctx.lineWidth = 4 * model.scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.x, f.baseY);
    ctx.lineTo(f.x, curTopY);
    ctx.stroke();

    if (stemT > 0.3) {
      const leafAlpha = Math.min(1, (stemT - 0.3) / 0.3);
      const leafY = f.baseY - (f.baseY - f.topY) * 0.42;
      ctx.globalAlpha = leafAlpha;
      drawLeaf(ctx, f.x, leafY, model.scale, -1, model.theme.stem);
      drawLeaf(ctx, f.x, leafY + 10 * model.scale, model.scale, 1, model.theme.stem);
      ctx.globalAlpha = 1;
    }

    const local = Math.max(0, Math.min(1, (bloomT - f.delay) / (1 - f.delay)));
    if (local <= 0) return;
    const open = Math.max(0, easeOutBack(local));
    if (open <= 0.02) return;
    drawFlowerHead(ctx, f, Math.min(1.08, open), curTopY);
  });
}

function setupCanvas(canvas, W, H) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

// Sapı büyüten, ardından çiçeği açan canlı animasyon. Her çağrıda baştan oynar.
function animateBouquet(canvas, themeKey, seedStr, W, H, opts) {
  opts = opts || {};
  const duration = opts.duration || 2600;
  const theme = THEMES[themeKey] || THEMES.mixed;
  const ctx = setupCanvas(canvas, W, H);

  if (canvas._bouquetRaf) cancelAnimationFrame(canvas._bouquetRaf);
  canvas.classList.remove('idle-breathe');

  let start = null;
  function frame(ts) {
    if (start === null) start = ts;
    const model = frame.model || (frame.model = buildBouquetModel(theme, seedStr, W, H));
    const t = Math.min(1, (ts - start) / duration);
    const stemT = Math.min(1, t / 0.42);
    const bloomT = Math.max(0, Math.min(1, (t - 0.3) / 0.7));

    drawModelFrame(ctx, model, W, H, stemT, bloomT);

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
    animateBouquet(previewCanvas, theme, 'preview-' + theme, 220, 260, { duration: 2000 });
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
  animateBouquet(canvas, data.theme, 'present-' + data.to, 280, 340, { duration: 3200 });

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
