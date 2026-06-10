const colorPicker = document.getElementById('colorPicker');
const hexInput = document.getElementById('hexInput');
const colorPreview = document.getElementById('colorPreview');
const rgbValue = document.getElementById('rgbValue');
const hslValue = document.getElementById('hslValue');
const cmykValue = document.getElementById('cmykValue');
const hexValue = document.getElementById('hexValue');
const convertBtn = document.getElementById('convertBtn');

colorPicker.addEventListener('input', () => {
  hexInput.value = colorPicker.value;
  convertFromHex(colorPicker.value);
});

hexInput.addEventListener('input', () => {
  let val = hexInput.value.trim();
  if (val.startsWith('#')) val = val.slice(1);
  if (/^[0-9A-Fa-f]{6}$/.test(val) || /^[0-9A-Fa-f]{3}$/.test(val)) {
    if (val.length === 3) val = val.split('').map(c => c + c).join('');
    colorPicker.value = '#' + val;
    convertFromHex('#' + val);
  }
});

convertBtn.addEventListener('click', () => {
  let val = hexInput.value.trim();
  if (val.startsWith('#')) val = val.slice(1);
  if (/^[0-9A-Fa-f]{6}$/.test(val)) {
    colorPicker.value = '#' + val;
    convertFromHex('#' + val);
  } else if (/^[0-9A-Fa-f]{3}$/.test(val)) {
    val = val.split('').map(c => c + c).join('');
    colorPicker.value = '#' + val;
    convertFromHex('#' + val);
  } else {
    hexInput.style.borderColor = '#ff6b6b';
    setTimeout(() => { hexInput.style.borderColor = ''; }, 1500);
  }
});

function convertFromHex(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  colorPreview.style.background = hex;
  hexValue.textContent = hex.toUpperCase();
  rgbValue.textContent = `${r}, ${g}, ${b}`;

  const [h, s, l] = rgbToHsl(r, g, b);
  hslValue.textContent = `${h}°, ${s}%, ${l}%`;

  const [ck, cm, cy, ck2] = rgbToCmyk(r, g, b);
  cmykValue.textContent = `${ck}%, ${cm}%, ${cy}%, ${ck2}%`;

  if (window.PriqurAnalytics) {
    window.PriqurAnalytics.trackOperation('color_converter', { hex });
  }
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function rgbToCmyk(r, g, b) {
  const cr = r / 255, cg = g / 255, cb = b / 255;
  const k = 1 - Math.max(cr, cg, cb);
  if (k === 1) return [0, 0, 0, 100];
  return [
    Math.round(((1 - cr - k) / (1 - k)) * 100),
    Math.round(((1 - cg - k) / (1 - k)) * 100),
    Math.round(((1 - cb - k) / (1 - k)) * 100),
    Math.round(k * 100)
  ];
}

document.querySelectorAll('.copy-color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.dataset.value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓';
      setTimeout(() => { btn.innerHTML = orig; }, 1500);
    });
  });
});

document.getElementById('colorPicker').value = '#22c98a';
document.getElementById('hexInput').value = '#22c98a';
convertFromHex('#22c98a');

document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question')?.addEventListener('click', () => item.classList.toggle('open'));
});
