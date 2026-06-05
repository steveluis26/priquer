let resultBlob = null;
let originalFileName = '';
let originalFormat = '';

const uploadZone   = document.getElementById('uploadZone');
const resultZone   = document.getElementById('resultZone');
const fileInput    = document.getElementById('fileInput');
const formatSelect = document.getElementById('formatSelect');
const convertBtn   = document.getElementById('convertBtn');

uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => { uploadZone.classList.remove('drag-over'); });
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault(); uploadZone.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (files.length) handleFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
  fileInput.value = '';
});

document.querySelector('.btn-upload')?.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });

function handleFile(file) {
  if (file.size > 50 * 1024 * 1024) { alert('El archivo es muy grande. Máximo 50MB.'); return; }

  originalFileName = file.name.replace(/\.[^/.]+$/, '');
  originalFormat = file.type;
  resultBlob = null;

  const url = URL.createObjectURL(file);
  document.getElementById('previewBefore').src = url;
  document.getElementById('previewBefore').style.display = 'block';
  document.getElementById('previewAfter').style.display = 'none';
  document.getElementById('sizeBefore').textContent = formatSize(file.size);
  document.getElementById('sizeAfter').textContent = '—';
  document.getElementById('infoAfter').textContent = `Archivo: ${file.name}`;

  document.querySelector('.upload-zone').style.display = 'none';
  document.querySelector('.converter-body').style.display = 'block';

  convertBtn.disabled = false;
  convertBtn.textContent = `Convertir a ${formatSelect.options[formatSelect.selectedIndex].text.toUpperCase()}`;

  convertBtn.onclick = () => convertImage(file);
}

async function convertImage(file) {
  const targetFormat = formatSelect.value;
  convertBtn.disabled = true;
  convertBtn.textContent = 'Convirtiendo...';

  try {
    const img = await loadImage(URL.createObjectURL(file));
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    let mimeType = 'image/png';
    let ext = 'png';
    if (targetFormat === 'jpeg') { mimeType = 'image/jpeg'; ext = 'jpg'; }
    else if (targetFormat === 'webp') { mimeType = 'image/webp'; ext = 'webp'; }

    const quality = targetFormat === 'jpeg' ? 0.92 : 1;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));
    resultBlob = blob;

    const afterUrl = URL.createObjectURL(blob);
    document.getElementById('previewAfter').src = afterUrl;
    document.getElementById('previewAfter').style.display = 'block';
    document.getElementById('sizeAfter').textContent = formatSize(blob.size);
    document.getElementById('btnDownload').style.display = 'flex';

    convertBtn.textContent = '✓ Convertido';
    setTimeout(() => { convertBtn.disabled = false; convertBtn.textContent = `Convertir a ${formatSelect.options[formatSelect.selectedIndex].text.toUpperCase()}`; }, 2000);

    if (window.PriqurAnalytics) {
      window.PriqurAnalytics.trackOperation('image_converter', { format: targetFormat, file_size: file.size });
    }
  } catch (err) {
    console.error('Error convirtiendo:', err);
    convertBtn.textContent = 'Error — Intenta de nuevo';
    convertBtn.disabled = false;
    if (window.PriqurAnalytics) window.PriqurAnalytics.trackError('image_converter', err.message);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

document.getElementById('btnDownload')?.addEventListener('click', () => {
  if (!resultBlob) return;
  const ext = formatSelect.value;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(resultBlob);
  a.download = `${originalFileName}.${ext}`;
  a.click();
  if (window.PriqurAnalytics) window.PriqurAnalytics.trackDownload('image_converter');
});

document.getElementById('btnNewImage')?.addEventListener('click', () => {
  document.querySelector('.upload-zone').style.display = 'flex';
  document.querySelector('.converter-body').style.display = 'none';
  document.getElementById('btnDownload').style.display = 'none';
  fileInput.value = '';
  resultBlob = null;
});

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question')?.addEventListener('click', () => item.classList.toggle('open'));
});
