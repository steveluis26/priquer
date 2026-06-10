let currentFile = null;
let resizedBlob = null;
let currentFormat = 'jpeg';

const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const controlsArea = document.getElementById('controlsArea');
const processingZone = document.getElementById('processingZone');
const resultZone = document.getElementById('resultZone');
const progressFill = document.getElementById('progressFill');
const previewBefore = document.getElementById('previewBefore');
const previewAfter = document.getElementById('previewAfter');
const sizeBefore = document.getElementById('sizeBefore');
const sizeAfter = document.getElementById('sizeAfter');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const lockRatio = document.getElementById('lockRatio');
const formatSelect = document.getElementById('formatSelect');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const resizerBtn = document.getElementById('resizerBtn');
const btnDownload = document.getElementById('btnDownload');
const btnNewImage = document.getElementById('btnNewImage');

let originalWidth = 0;
let originalHeight = 0;
let aspectRatio = 1;
let imgElement = null;

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

qualitySlider.addEventListener('input', () => {
  qualityValue.textContent = qualitySlider.value + '%';
});

function handleFile(file) {
  if (file.size > 50 * 1024 * 1024) { alert('El archivo es muy grande. Máximo 50MB.'); return; }
  currentFile = file;
  resizedBlob = null;

  const img = new Image();
  img.onload = () => {
    originalWidth = img.naturalWidth;
    originalHeight = img.naturalHeight;
    aspectRatio = originalWidth / originalHeight;
    imgElement = img;

    previewBefore.src = URL.createObjectURL(file);
    sizeBefore.textContent = `${originalWidth}×${originalHeight} · ${formatSize(file.size)}`;

    widthInput.value = originalWidth;
    heightInput.value = originalHeight;

    uploadZone.style.display = 'none';
    controlsArea.style.display = 'block';

    updateResizerBtn();
  };
  img.src = URL.createObjectURL(file);
}

widthInput.addEventListener('input', () => {
  if (lockRatio.checked && originalWidth > 0) {
    const w = parseInt(widthInput.value) || 0;
    heightInput.value = Math.round(w / aspectRatio);
  }
  updateResizerBtn();
});

heightInput.addEventListener('input', () => {
  if (lockRatio.checked && originalHeight > 0) {
    const h = parseInt(heightInput.value) || 0;
    widthInput.value = Math.round(h * aspectRatio);
  }
  updateResizerBtn();
});

formatSelect.addEventListener('change', () => {
  currentFormat = formatSelect.value;
  updateResizerBtn();
});

function updateResizerBtn() {
  const w = parseInt(widthInput.value);
  const h = parseInt(heightInput.value);
  resizerBtn.disabled = !(w > 0 && h > 0 && currentFile);
  if (!resizerBtn.disabled) {
    resizerBtn.textContent = `Redimensionar a ${w}×${h}`;
  }
}

resizerBtn.addEventListener('click', resizeImage);

function resizeImage() {
  const w = parseInt(widthInput.value);
  const h = parseInt(heightInput.value);
  if (!w || !h || !imgElement) return;

  controlsArea.style.display = 'none';
  processingZone.style.display = 'block';
  progressFill.style.width = '0%';

  setTimeout(() => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imgElement, 0, 0, w, h);

    const quality = parseInt(qualitySlider.value) / 100;
    const mimeType = currentFormat === 'jpeg' ? 'image/jpeg' : currentFormat === 'png' ? 'image/png' : 'image/webp';

    canvas.toBlob((blob) => {
      resizedBlob = blob;
      progressFill.style.width = '100%';
      setTimeout(() => {
        processingZone.style.display = 'none';
        resultZone.style.display = 'block';
      }, 400);

      previewAfter.src = URL.createObjectURL(blob);
      sizeAfter.textContent = `${w}×${h} · ${formatSize(blob.size)}`;

      if (window.PriqurAnalytics) {
        window.PriqurAnalytics.trackOperation('image_resizer', {
          original: `${originalWidth}×${originalHeight}`,
          resized: `${w}×${h}`,
          format: currentFormat
        });
      }
    }, mimeType, quality);
  }, 300);
}

btnDownload.addEventListener('click', () => {
  if (!resizedBlob || !currentFile) return;
  const ext = currentFormat === 'jpeg' ? 'jpg' : currentFormat;
  const name = currentFile.name.replace(/\.[^/.]+$/, '') + '_redimensionada.' + ext;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(resizedBlob);
  a.download = name;
  a.click();
  if (window.PriqurAnalytics) window.PriqurAnalytics.trackDownload('image_resizer');
});

btnNewImage.addEventListener('click', () => {
  uploadZone.style.display = 'flex';
  controlsArea.style.display = 'none';
  processingZone.style.display = 'none';
  resultZone.style.display = 'none';
  fileInput.value = '';
  currentFile = null;
  resizedBlob = null;
  imgElement = null;
});

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question')?.addEventListener('click', () => item.classList.toggle('open'));
});
