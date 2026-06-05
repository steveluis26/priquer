let qrCodeInstance = null;

const textInput = document.getElementById('qrInput');
const generateBtn = document.getElementById('generateBtn');
const qrContainer = document.getElementById('qrContainer');
const resultBox = document.getElementById('qrResult');
const downloadBtn = document.getElementById('downloadBtn');
const colorPicker = document.getElementById('colorPicker');
const bgColorPicker = document.getElementById('bgColorPicker');
const sizeSelect = document.getElementById('sizeSelect');
const errorLevelSelect = document.getElementById('errorLevelSelect');

generateBtn.addEventListener('click', generateQR);
textInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') generateQR(); });

function generateQR() {
  const text = textInput.value.trim();
  if (!text) { textInput.focus(); return; }

  qrContainer.innerHTML = '';
  const size = parseInt(sizeSelect.value);
  const color = colorPicker.value;
  const bgColor = bgColorPicker.value;
  const errorLevel = errorLevelSelect.value;

  try {
    qrCodeInstance = new QRCode(qrContainer, {
      text,
      width: size,
      height: size,
      colorDark: color,
      colorLight: bgColor,
      correctLevel: getErrorLevel(errorLevel),
    });

    setTimeout(() => {
      const canvas = qrContainer.querySelector('canvas');
      const img = qrContainer.querySelector('img');
      if (canvas) {
        resultBox.src = canvas.toDataURL('image/png');
        resultBox.style.display = 'block';
      } else if (img) {
        resultBox.src = img.src;
        resultBox.style.display = 'block';
      }
      qrContainer.style.display = 'none';
      resultBox.style.display = 'block';
      downloadBtn.style.display = 'inline-flex';
      downloadBtn.dataset.filename = text.replace(/[^a-z0-9]/gi, '_').substring(0, 30) || 'qr';
    }, 100);

    if (window.PriqurAnalytics) {
      window.PriqurAnalytics.trackOperation('qr_generator');
    }
  } catch (err) {
    console.error('QR error:', err);
    alert('Error al generar el código QR. Intenta de nuevo.');
    if (window.PriqurAnalytics) window.PriqurAnalytics.trackError('qr_generator', err.message);
  }
}

function getErrorLevel(level) {
  const map = { L: 1, M: 0, Q: 3, H: 2 };
  return map[level] !== undefined ? map[level] : 0;
}

downloadBtn.addEventListener('click', () => {
  const canvas = qrContainer.querySelector('canvas');
  if (canvas) {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${downloadBtn.dataset.filename || 'qr'}.png`;
    a.click();
    if (window.PriqurAnalytics) window.PriqurAnalytics.trackDownload('qr_generator');
  } else {
    const a = document.createElement('a');
    a.href = resultBox.src;
    a.download = `${downloadBtn.dataset.filename || 'qr'}.png`;
    a.click();
  }
});

document.getElementById('btnNewQR')?.addEventListener('click', () => {
  textInput.value = '';
  resultBox.style.display = 'none';
  downloadBtn.style.display = 'none';
  qrContainer.style.display = 'block';
  qrContainer.innerHTML = '';
  textInput.focus();
});

document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question')?.addEventListener('click', () => item.classList.toggle('open'));
});
