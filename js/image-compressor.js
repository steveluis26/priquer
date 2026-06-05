let currentFile = null;
let compressedBlob = null;

const uploadZone    = document.getElementById('uploadZone');
const fileInput     = document.getElementById('fileInput');
const processingZone = document.getElementById('processingZone');
const resultZone    = document.getElementById('resultZone');
const progressFill  = document.getElementById('progressFill');
const originalPreview = document.getElementById('originalPreview');
const resultPreview  = document.getElementById('resultPreview');
const originalSize   = document.getElementById('originalSize');
const resultSize     = document.getElementById('resultSize');
const savings        = document.getElementById('savings');
const processingTitle = document.getElementById('processingTitle');
const processingMsg   = document.getElementById('processingMsg');

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
  currentFile = file;
  compressedBlob = null;

  originalPreview.src = URL.createObjectURL(file);
  originalSize.textContent = formatSize(file.size);

  uploadZone.style.display = 'none';
  processingZone.style.display = 'block';
  progressFill.style.width = '0%';
  processingTitle.textContent = 'Comprimiendo imagen...';
  processingMsg.textContent = 'Optimizando tamaño sin perder calidad.';

  compressImage(file);
}

function getQualitySettings() {
  const selected = document.querySelector('input[name="quality"]:checked');
  const val = selected ? selected.value : 'medium';
  if (val === 'high')  return { maxSizeMB: 2, maxWidthOrHeight: 4096, useWebWorker: true, fileType: currentFile.type };
  if (val === 'low')   return { maxSizeMB: 0.3, maxWidthOrHeight: 1600, useWebWorker: true, fileType: currentFile.type };
  return { maxSizeMB: 1, maxWidthOrHeight: 2560, useWebWorker: true, fileType: currentFile.type };
}

let simulateProgress;

async function compressImage(file) {
  let progressVal = 0;
  simulateProgress = setInterval(() => {
    progressVal = Math.min(progressVal + Math.random() * 10, 85);
    progressFill.style.width = progressVal + '%';
  }, 300);

  try {
    const options = getQualitySettings();
    options.onProgress = (p) => {
      progressVal = Math.min(p * 0.85 + 10, 85);
      progressFill.style.width = progressVal + '%';
    };

    compressedBlob = await imageCompression(file, options);

    clearInterval(simulateProgress);
    progressFill.style.width = '100%';

    setTimeout(() => {
      processingZone.style.display = 'none';
      resultZone.style.display = 'block';
    }, 400);

    resultPreview.src = URL.createObjectURL(compressedBlob);
    resultSize.textContent = formatSize(compressedBlob.size);

    const ratio = ((1 - compressedBlob.size / file.size) * 100).toFixed(1);
    savings.textContent = `-${ratio}%`;

    if (window.PriqurAnalytics) {
      window.PriqurAnalytics.trackOperation('image_compressor', { file_size: file.size, ratio: parseFloat(ratio) });
    }
  } catch (err) {
    clearInterval(simulateProgress);
    console.error('Error compressing:', err);
    processingTitle.textContent = 'Error al comprimir';
    processingMsg.textContent = 'Intenta de nuevo o usa una imagen diferente.';
    progressFill.style.width = '0%';
    if (window.PriqurAnalytics) window.PriqurAnalytics.trackError('image_compressor', err.message);
  }
}

document.getElementById('btnDownload')?.addEventListener('click', () => {
  if (!compressedBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(compressedBlob);
  const name = currentFile ? currentFile.name.replace(/\.[^/.]+$/, '') + '_comprimida.' + currentFile.name.split('.').pop() : 'imagen_comprimida.jpg';
  a.download = name;
  a.click();
  if (window.PriqurAnalytics) window.PriqurAnalytics.trackDownload('image_compressor');
});

document.getElementById('btnNewImage')?.addEventListener('click', () => {
  uploadZone.style.display = 'flex';
  processingZone.style.display = 'none';
  resultZone.style.display = 'none';
  fileInput.value = '';
  currentFile = null;
  compressedBlob = null;
});

document.querySelectorAll('.quality-option').forEach(opt => {
  opt.addEventListener('click', function() {
    document.querySelectorAll('.quality-option').forEach(o => o.classList.remove('active'));
    this.classList.add('active');
  });
});

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question')?.addEventListener('click', () => item.classList.toggle('open'));
});
