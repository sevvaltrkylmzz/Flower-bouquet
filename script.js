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
  { x: -84, h: 135, size: 100 },
  { x: -45, h: 175, size: 114 },
  { x: 0, h: 198, size: 128 },
  { x: 45, h: 175, size: 114 },
  { x: 84, h: 135, size: 100 }
];
const LEAF_SPIKE_COUNT = 15;

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function shadeHex(hex, amount) {
  const n = parseInt(hex.replace('#', ''), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + amount)));
  g = Math.max(0, Math.min(255, Math.round(g + amount)));
  b = Math.max(0, Math.min(255, Math.round(b + amount)));
  return `rgb(${r},${g},${b})`;
}

function hexWithAlpha(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// Mevcut yolu (path) dolduktan sonra, aynı yola kırpılmış ince çizgilerle
// tarar (hatching) — düz dolgu yerine kazıma/gravür dokusu verir.
function hatchCurrentPath(ctx, color, minY, maxY, halfWidth, spacing, seed) {
  ctx.save();
  ctx.clip();
  ctx.lineWidth = Math.max(0.6, spacing * 0.3);
  ctx.strokeStyle = color;
  for (let y = minY; y <= maxY; y += spacing) {
    const a = 0.22 + 0.14 * Math.sin((y + seed) * 0.8);
    ctx.globalAlpha = Math.max(0.1, a);
    ctx.beginPath();
    ctx.moveTo(-halfWidth, y);
    ctx.lineTo(halfWidth, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Yuvarlak, tek parça gerçekçi taç yaprağı: sivri yıldız ucu yerine
// yumuşak, tombul bir uç (gerçek gül/lale yaprağına daha yakın).
function roundPetalPath(ctx, length, width) {
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-width * 0.6, -length * 0.22, -width * 0.52, -length * 0.95, 0, -length);
  ctx.bezierCurveTo(width * 0.52, -length * 0.95, width * 0.6, -length * 0.22, 0, 0);
  ctx.closePath();
}

function drawPetal(ctx, length, width, color, seed, detailed) {
  roundPetalPath(ctx, length, width);
  const grad = ctx.createLinearGradient(0, 0, 0, -length);
  grad.addColorStop(0, shadeHex(color, -24));
  grad.addColorStop(0.55, color);
  grad.addColorStop(0.88, shadeHex(color, 26));
  grad.addColorStop(1, shadeHex(color, 44));
  ctx.fillStyle = grad;
  ctx.fill();

  // yan gölge — ince, kıvrımlı kupa hissi verir, çok hafif
  roundPetalPath(ctx, length, width);
  ctx.save();
  ctx.clip();
  const sideGrad = ctx.createLinearGradient(-width * 0.5, 0, width * 0.5, 0);
  sideGrad.addColorStop(0, hexWithAlpha('#000000', 0.12));
  sideGrad.addColorStop(0.5, hexWithAlpha('#000000', 0));
  sideGrad.addColorStop(1, hexWithAlpha('#000000', 0.08));
  ctx.fillStyle = sideGrad;
  ctx.fillRect(-width, -length, width * 2, length);

  if (detailed) {
    // parlak vurgu — ipeksi/saten yaprak hissi veren yumuşak ışık lekesi
    const sheen = ctx.createRadialGradient(
      -width * 0.16, -length * 0.62, 0,
      -width * 0.16, -length * 0.62, width * 0.55
    );
    sheen.addColorStop(0, hexWithAlpha('#ffffff', 0.32));
    sheen.addColorStop(1, hexWithAlpha('#ffffff', 0));
    ctx.fillStyle = sheen;
    ctx.fillRect(-width, -length, width * 2, length);
  }
  ctx.restore();

  // orta damar (merkez çizgi) — hafif gölge, çiçeğe derinlik katar
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = shadeHex(color, -55);
  ctx.lineWidth = Math.max(0.6, width * 0.03);
  ctx.beginPath();
  ctx.moveTo(0, -length * 0.12);
  ctx.lineTo(0, -length * 0.9);
  ctx.stroke();
  ctx.restore();
}

function spikePath(ctx, length, width) {
  ctx.beginPath();
  ctx.moveTo(-width * 0.5, 0);
  ctx.quadraticCurveTo(-width * 0.2, -length * 0.6, 0, -length);
  ctx.quadraticCurveTo(width * 0.2, -length * 0.6, width * 0.5, 0);
  ctx.closePath();
}

function drawSpike(ctx, length, width, color, seed) {
  spikePath(ctx, length, width);
  ctx.fillStyle = color;
  ctx.fill();

  spikePath(ctx, length, width);
  hatchCurrentPath(ctx, shadeHex(color, -45), -length, 0, width * 0.6, Math.max(2, width * 0.3), seed);
}

// Buketin sabit "modelini" (sap/çiçek/yaprak konumları, renkleri, gecikmeleri)
// üretir. Aynı tohumla her zaman aynı şekli verir; animasyonda yeniden
// rastgelelenmez.
function buildBouquetModel(theme, seedStr, W, H) {
  const rnd = seededRandom(hashString(seedStr || 'bouquet'));
  const sx = W / REF_W, sy = H / REF_H;
  const s = Math.min(sx, sy);
  const baseY = H - 46 * sy;

  const ringSpecs = theme.flat
    ? [
        { count: 13, radiusFrac: 0.05, lenFrac: 1.0, widthFrac: 0.16, openMax: 1.05, shade: 30, delayFrac: 0 },
        { count: 11, radiusFrac: 0.0, lenFrac: 0.6, widthFrac: 0.12, openMax: 0.5, shade: -10, delayFrac: 0.25 }
      ]
    : [
        { count: 7, radiusFrac: 0.09, lenFrac: 1.0, widthFrac: 0.42, openMax: 1.1, shade: 18, delayFrac: 0 },
        { count: 6, radiusFrac: 0.04, lenFrac: 0.72, widthFrac: 0.44, openMax: 0.72, shade: -4, delayFrac: 0.18 },
        { count: 5, radiusFrac: 0.0, lenFrac: 0.42, widthFrac: 0.5, openMax: 0.4, shade: -22, delayFrac: 0.34 }
      ];

  const flowers = LAYOUT.map((f, i) => {
    const jitter = (rnd() - 0.5) * 6 * sx;
    const color = theme.flowerColors[i % theme.flowerColors.length];
    const ringAngleBase = rnd() * Math.PI * 2;
    const rings = ringSpecs.map((spec, ri) => {
      const petals = [];
      for (let j = 0; j < spec.count; j++) {
        petals.push({
          angle: (Math.PI * 2 / spec.count) * j + ringAngleBase + ri * 0.52,
          jitter: (rnd() - 0.5) * 0.18
        });
      }
      return { spec, petals, color: shadeHex(color, spec.shade) };
    });
    return {
      x: W / 2 + f.x * sx + jitter,
      baseY,
      topY: baseY - f.h * sy,
      size: f.size * s,
      color,
      center: theme.centers[i % theme.centers.length],
      delay: (i / (LAYOUT.length - 1)) * 0.3,
      rings,
      flat: theme.flat,
      hatchSeed: i * 37
    };
  });

  const leafSpikes = [];
  for (let i = 0; i < LEAF_SPIKE_COUNT; i++) {
    const t = i / (LEAF_SPIKE_COUNT - 1);
    leafSpikes.push({
      x: W / 2 + (-1 + 2 * t) * 100 * sx + (rnd() - 0.5) * 8 * sx,
      len: (50 + rnd() * 34 + (1 - Math.abs(t - 0.5) * 2) * 24) * sy,
      width: (10 + rnd() * 6) * s,
      lean: (t - 0.5) * 0.9,
      delay: Math.abs(t - 0.5) * 0.3,
      hatchSeed: i * 19
    });
  }

  return { theme, flowers, leafSpikes, baseY, scale: s };
}

function drawFlowerHead(ctx, f, bloomT, headY) {
  const budT = Math.min(1, bloomT / 0.32);
  const openT = Math.max(0, Math.min(1, (bloomT - 0.26) / 0.74));
  if (budT <= 0.01) return;

  if (openT < 0.94) {
    const budScale = budT * (1 - 0.55 * openT);
    if (budScale > 0.03) {
      ctx.save();
      ctx.translate(f.x, headY);
      ctx.scale(budScale, budScale);
      const len = f.size * 0.4;
      ctx.beginPath();
      ctx.ellipse(0, -len * 0.5, f.size * 0.13, len * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = shadeHex(f.color, -70);
      ctx.fill();
      ctx.restore();
    }
  }

  if (openT > 0.02) {
    const open = Math.max(0, Math.min(1.1, easeOutBack(openT)));
    const spin = Math.min(1, openT * 1.3);

    // yumuşak ışık halesi — koyu zemine karşı "wow" parlaklığı
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glowR = f.size * 1.15 * open;
    const glow = ctx.createRadialGradient(f.x, headY, 0, f.x, headY, glowR);
    glow.addColorStop(0, hexWithAlpha(f.color, 0.3));
    glow.addColorStop(1, hexWithAlpha(f.color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(f.x, headY, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // açılma doruğunda kısa bir parlama (flaş) — dramatik vurgu
    const flash = Math.max(0, 1 - Math.abs(openT - 0.88) * 9);
    if (flash > 0.02) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = flash * 0.55;
      const fg = ctx.createRadialGradient(f.x, headY, 0, f.x, headY, f.size * 0.9);
      fg.addColorStop(0, '#ffffff');
      fg.addColorStop(1, hexWithAlpha('#ffffff', 0));
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(f.x, headY, f.size * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // gölgeli taban — yaprakların arasına derinlik katan koyu kalp
    ctx.save();
    ctx.globalAlpha = 0.5 * open;
    const shadow = ctx.createRadialGradient(f.x, headY, 0, f.x, headY, f.size * 0.3);
    shadow.addColorStop(0, shadeHex(f.color, -75));
    shadow.addColorStop(1, hexWithAlpha(shadeHex(f.color, -75), 0));
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(f.x, headY, f.size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // halkalar dıştan içe çizilir: dış taç yaprakları en erken ve en geniş
    // açılır, iç halkalar geç ve az açılarak gülün dolgun merkezini oluşturur.
    f.rings.forEach((ring, ri) => {
      const spec = ring.spec;
      const localT = Math.max(0, Math.min(1, (openT - spec.delayFrac) / (1 - spec.delayFrac)));
      if (localT <= 0.01) return;
      const ringOpen = Math.max(0, Math.min(spec.openMax * 1.08, easeOutBack(localT) * spec.openMax));
      if (ringOpen <= 0.03) return;
      const petalLen = f.size * 0.62 * spec.lenFrac;
      const petalWidth = f.size * spec.widthFrac * (f.flat ? 0.82 : 1);
      const radius = f.size * spec.radiusFrac * Math.min(1, localT * 1.4);

      ring.petals.forEach((p, pi) => {
        const angle = p.angle * spin + p.jitter * localT;
        ctx.save();
        ctx.translate(f.x, headY);
        ctx.rotate(angle);
        ctx.translate(0, -radius);
        ctx.scale(ringOpen, ringOpen);
        drawPetal(ctx, petalLen, petalWidth, ring.color, f.hatchSeed + ri * 13 + pi * 5, ri === 0, 1);
        ctx.restore();
      });
    });

    // erkek organlar (stamen) — ince, kavisli, uçlarında başçık
    if (openT > 0.5) {
      const stamenA = Math.min(1, (openT - 0.5) / 0.35);
      ctx.save();
      ctx.globalAlpha = stamenA;
      const stamenCount = 7;
      for (let k = 0; k < stamenCount; k++) {
        const a = (Math.PI * 2 / stamenCount) * k + 0.3;
        const len = f.size * 0.32 * open;
        const x2 = f.x + Math.cos(a) * len * 0.3;
        const y2 = headY - len * 0.9 + Math.sin(a) * len * 0.2;
        ctx.strokeStyle = shadeHex(f.center, 20);
        ctx.lineWidth = Math.max(0.6, f.size * 0.012);
        ctx.beginPath();
        ctx.moveTo(f.x, headY);
        ctx.quadraticCurveTo(f.x + Math.cos(a) * len * 0.5, headY - len * 0.6, x2, y2);
        ctx.stroke();
        ctx.fillStyle = shadeHex(f.center, -20);
        ctx.beginPath();
        ctx.ellipse(x2, y2, f.size * 0.022, f.size * 0.04, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(f.x, headY);
    ctx.scale(open, open);
    const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, f.size * 0.11);
    centerGrad.addColorStop(0, shadeHex(f.center, 35));
    centerGrad.addColorStop(1, f.center);
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, f.size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Modeli, sap (stemT) ve açılma (bloomT) ilerlemesine göre tuvale çizer.
function drawModelFrame(ctx, model, W, H, stemT, bloomT) {
  ctx.clearRect(0, 0, W, H);
  const grownStem = easeOutCubic(stemT);

  model.leafSpikes.forEach((sp) => {
    const local = Math.max(0, Math.min(1, (stemT - sp.delay) / (1 - sp.delay)));
    const grown = easeOutCubic(local);
    if (grown <= 0.01) return;
    ctx.save();
    ctx.translate(sp.x, model.baseY);
    ctx.rotate(sp.lean * 0.3);
    drawSpike(ctx, sp.len * grown, sp.width, model.theme.stem, sp.hatchSeed);
    ctx.restore();
  });

  model.flowers.forEach((f) => {
    const curTopY = f.baseY - (f.baseY - f.topY) * grownStem;

    ctx.strokeStyle = model.theme.stem;
    ctx.lineWidth = 3.4 * model.scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.x, f.baseY);
    ctx.lineTo(f.x, curTopY);
    ctx.stroke();

    const local = Math.max(0, Math.min(1, (bloomT - f.delay) / (1 - f.delay)));
    drawFlowerHead(ctx, f, local, curTopY);
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
    animateBouquet(previewCanvas, theme, 'preview-' + theme, 340, 360, { duration: 2600 });
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
  animateBouquet(canvas, data.theme, 'present-' + data.to, 440, 480, { duration: 4000 });

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
