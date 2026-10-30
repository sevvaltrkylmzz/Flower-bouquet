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
  rose:  { petal: 'var(--rose-petal)',  petal2: 'var(--rose-petal-2)',  center: 'var(--rose-center)',  flat: false },
  tulip: { petal: 'var(--tulip-petal)', petal2: 'var(--tulip-petal-2)', center: 'var(--tulip-center)', flat: false },
  daisy: { petal: 'var(--daisy-petal)', petal2: 'var(--daisy-petal-2)', center: 'var(--daisy-center)', flat: true  },
  sun:   { petal: 'var(--sun-petal)',   petal2: 'var(--sun-petal-2)',   center: 'var(--sun-center)',   flat: true  }
};

// ---------- Arka plan uçuşan yapraklar ----------

function spawnPetals() {
  const layer = document.getElementById('petalLayer');
  if (!layer) return;
  setInterval(() => {
    const p = document.createElement('div');
    p.className = 'fp';
    p.style.left = Math.random() * 100 + 'vw';
    const dur = 6 + Math.random() * 6;
    p.style.animationDuration = dur + 's';
    p.style.background = Math.random() > 0.5 ? '#e75480' : '#ffc1d9';
    p.style.width = p.style.height = (8 + Math.random() * 10) + 'px';
    layer.appendChild(p);
    setTimeout(() => p.remove(), dur * 1000 + 500);
  }, 450);
}

// ---------- Oluşturma ekranı ----------

function initCreateScreen() {
  const form = document.getElementById('bouquetForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const to = document.getElementById('toName').value.trim();
    const from = document.getElementById('fromName').value.trim();
    const message = document.getElementById('message').value.trim();
    const theme = form.querySelector('input[name="theme"]:checked').value;

    if (!to || !from || !message) return;

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

function buildBouquet(theme) {
  const cfg = THEMES[theme] || THEMES.rose;
  const stemsEl = document.getElementById('stems');
  const flowersEl = document.getElementById('flowers');

  // flower positions (x offset from center, height, size, delay)
  const layout = [
    { x: -70, h: 150, size: 60, delay: 0.0,  petals: cfg.petal2 },
    { x: -35, h: 190, size: 68, delay: 0.15, petals: cfg.petal },
    { x: 0,   h: 210, size: 76, delay: 0.3,  petals: cfg.petal2 },
    { x: 35,  h: 190, size: 68, delay: 0.45, petals: cfg.petal },
    { x: 70,  h: 150, size: 60, delay: 0.6,  petals: cfg.petal2 }
  ];

  layout.forEach((f) => {
    // stem
    const stem = document.createElement('div');
    stem.className = 'stem';
    stem.style.left = `calc(50% + ${f.x}px)`;
    stem.style.setProperty('--stem-h', f.h + 'px');
    stem.style.animationDelay = f.delay + 's';
    stemsEl.appendChild(stem);

    // leaf
    const leaf = document.createElement('div');
    leaf.className = 'leaf';
    leaf.style.left = `calc(50% + ${f.x + (f.x < 0 ? -18 : 2)}px)`;
    leaf.style.bottom = (f.h * 0.35) + 'px';
    leaf.style.setProperty('--leaf-rot', (f.x < 0 ? -30 : 30) + 'deg');
    leaf.style.animationDelay = (f.delay + 0.3) + 's';
    stemsEl.appendChild(leaf);

    // flower head
    const flower = document.createElement('div');
    flower.className = 'flower' + (cfg.flat ? ' flat' : '');
    flower.style.left = `calc(50% + ${f.x - f.size / 2}px)`;
    flower.style.bottom = (f.h - f.size / 2.6) + 'px';
    flower.style.width = f.size + 'px';
    flower.style.height = f.size + 'px';
    flower.style.animationDelay = (f.delay + 0.5) + 's';

    const petalCount = cfg.flat ? 10 : 6;
    for (let i = 0; i < petalCount; i++) {
      const petal = document.createElement('div');
      petal.className = 'petal';
      petal.style.setProperty('--petal-color', f.petals);
      petal.style.transform = `translate(-50%, -100%) rotate(${(360 / petalCount) * i}deg)`;
      flower.appendChild(petal);
    }

    const center = document.createElement('div');
    center.className = 'flower-center';
    center.style.setProperty('--center-color', cfg.center);
    flower.appendChild(center);

    flowersEl.appendChild(flower);
  });
}

function typeText(el, text, speed = 35) {
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

  buildBouquet(data.theme);

  document.getElementById('toLine').textContent = `Sevgili ${data.to},`;
  document.getElementById('fromLine').textContent = `— ${data.from}`;

  setTimeout(async () => {
    const card = document.getElementById('messageCard');
    card.classList.remove('hidden');
    await typeText(document.getElementById('msgLine'), data.message);
  }, 2800);
}

// ---------- Başlat ----------

function main() {
  spawnPetals();
  initCreateScreen();

  const params = new URLSearchParams(window.location.search);
  const raw = params.get('data');
  if (raw) {
    const data = decodeData(raw);
    if (data && data.to && data.message && data.from) {
      initPresentScreen(data);
      return;
    }
  }
}

document.addEventListener('DOMContentLoaded', main);
