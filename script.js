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

// Küçük bir kaynak tuvale buket çizer (saplar + çiçek lekeleri).
function createSourceArt(theme, seedStr) {
  const W = 48, H = 66;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const rnd = seededRandom(hashString(seedStr || 'bouquet'));

  // sap / yaprak yıldızı (taban)
  const baseX = W / 2, baseY = H - 6;
  ctx.fillStyle = theme.stem;
  const spikes = 11;
  ctx.beginPath();
  for (let i = 0; i < spikes; i++) {
    const a = -Math.PI + (Math.PI / (spikes - 1)) * i;
    const len = 20 + rnd() * 14;
    const x1 = baseX + Math.cos(a) * 2, y1 = baseY + Math.sin(a) * 2;
    const x2 = baseX + Math.cos(a) * len, y2 = baseY + Math.sin(a) * len * 0.85;
    const perp = a + Math.PI / 2;
    const spread = 2.1;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 + Math.cos(perp) * spread, y2 + Math.sin(perp) * spread);
    ctx.lineTo(x2 - Math.cos(perp) * spread, y2 - Math.sin(perp) * spread);
    ctx.closePath();
  }
  ctx.fill();

  // çiçek lekeleri (üst küme) — merkeze yakın yoğun, kenarlarda seyrekleşen dolgu
  const cx = W / 2, cy = H * 0.4;
  const blobCount = 30;
  for (let i = 0; i < blobCount; i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = Math.sqrt(rnd()) * W * 0.34;
    const bx = cx + Math.cos(ang) * dist;
    const by = cy + Math.sin(ang) * dist * 0.8;
    const r = 6 + rnd() * 8;
    const color = theme.petals[Math.floor(rnd() * theme.petals.length)];
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return c;
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

function drawBouquet(canvas, themeKey, seedStr, cell) {
  const theme = THEMES[themeKey] || THEMES.mixed;
  const source = createSourceArt(theme, seedStr);
  renderHalftone(source, canvas, cell);
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
    drawBouquet(previewCanvas, theme, 'preview-' + theme, 7);
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
  drawBouquet(canvas, data.theme, 'present-' + data.to, 9);

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
