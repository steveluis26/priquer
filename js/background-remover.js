let resultBlob = null;
let originalFileName = '';

const uploadZone   = document.getElementById('uploadZone');
const processingZone = document.getElementById('processingZone');
const resultZone   = document.getElementById('resultZone');
const fileInput    = document.getElementById('fileInput');
const progressFill = document.getElementById('progressFill');
const originalImg  = document.getElementById('originalImg');
const resultImg    = document.getElementById('resultImg');
const resultImgWrap = document.getElementById('resultImgWrap');

// Drag & drop + click on upload zone
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (files.length) handleFiles(files);
});

// File input change (works on iOS because input is overlay with opacity:0)
fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  if (files.length) handleFiles(files);
  fileInput.value = '';
});

// Also allow clicking the .btn-upload to trigger file picker as fallback
document.querySelector('.btn-upload')?.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

// Update hint text for mobile
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  document.getElementById('uploadHint').textContent = 'toca para seleccionar desde tu dispositivo';
}

function handleFiles(files) {
  if (files.length === 1) {
    processImage(files[0]);
  } else {
    processMultiple(files);
  }
}

async function processImage(file) {
  if (file.size > 20 * 1024 * 1024) {
    alert('El archivo es muy grande. Máximo 20MB.');
    return;
  }

  originalFileName = file.name.replace(/\.[^/.]+$/, '');

  const originalUrl = URL.createObjectURL(file);
  originalImg.src = originalUrl;

  uploadZone.style.display = 'none';
  processingZone.style.display = 'block';
  resultZone.style.display = 'none';

  let progress = 0;
  const progressInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 8, 85);
    progressFill.style.width = progress + '%';
  }, 300);

  document.getElementById('processingTitle').textContent = 'Eliminando fondo...';
  document.getElementById('processingMsg').textContent = 'La IA está procesando tu imagen. Esto puede tomar entre 5 y 20 segundos.';

  try {
    const blob = await imglyRemoveBackground(file, {
      output: { format: 'image/png', quality: 1 },
      progress: (key, current, total) => {
        if (key === 'compute:inference') {
          const pct = Math.round((current / total) * 100);
          progressFill.style.width = Math.max(pct, progress) + '%';
        }
      }
    });

    clearInterval(progressInterval);
    progressFill.style.width = '100%';

    resultBlob = blob;
    const resultUrl = URL.createObjectURL(blob);
    resultImg.src = resultUrl;

    setTimeout(() => {
      processingZone.style.display = 'none';
      resultZone.style.display = 'block';

      if (window.PriqurAnalytics) {
        window.PriqurAnalytics.trackOperation('background_remover', { file_size: file.size });
      }
    }, 600);

  } catch (err) {
    clearInterval(progressInterval);
    console.error('Error procesando imagen:', err);
    document.getElementById('processingTitle').textContent = 'Ocurrió un error';
    document.getElementById('processingMsg').textContent = 'No se pudo procesar la imagen. Intenta con otra imagen o recarga la página.';
    progressFill.style.width = '0%';

    if (window.PriqurAnalytics) {
      window.PriqurAnalytics.trackError('background_remover', err.message || 'unknown');
    }

    setTimeout(resetTool, 3000);
  }
}

// Download
document.getElementById('btnDownload').addEventListener('click', () => {
  if (!resultBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(resultBlob);
  a.download = `${originalFileName}_sin_fondo.png`;
  a.click();

  if (window.PriqurAnalytics) {
    window.PriqurAnalytics.trackDownload('background_remover');
  }
});

// New image
document.getElementById('btnNewImage').addEventListener('click', resetTool);

function resetTool() {
  uploadZone.style.display = 'flex';
  processingZone.style.display = 'none';
  resultZone.style.display = 'none';
  progressFill.style.width = '0%';
  fileInput.value = '';
  resultBlob = null;
  originalFileName = '';

  if (resultImgWrap) {
    resultImgWrap.style.background = '';
  }
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  const firstSwatch = document.querySelector('.swatch[data-bg="transparent"]');
  if (firstSwatch) firstSwatch.classList.add('active');
}

// Background color preview swatches
document.querySelectorAll('.swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');

    const bg = swatch.dataset.bg;
    if (!resultImgWrap) return;

    if (bg === 'transparent') {
      resultImgWrap.style.background = '';
      resultImgWrap.style.backgroundImage = '';
    } else {
      resultImgWrap.style.background = bg;
      resultImgWrap.style.backgroundImage = 'none';
    }
  });
});

// Multi-image processing
async function processMultiple(files) {
  const queueContainer = document.getElementById('queueContainer');
  const imageQueue = document.getElementById('imageQueue');
  queueContainer.style.display = 'block';
  imageQueue.innerHTML = '';

  const items = files.map(file => {
    const item = document.createElement('div');
    item.className = 'queue-item';
    const previewUrl = URL.createObjectURL(file);
    item.innerHTML = `
      <img src="${previewUrl}" alt="${file.name}" />
      <div class="queue-item-info">
        <p class="queue-item-name">${file.name}</p>
        <p class="queue-item-status status-pending">Pendiente</p>
      </div>
    `;
    imageQueue.appendChild(item);
    return { file, item };
  });

  processImage(files[0]);

  for (let i = 1; i < items.length; i++) {
    const { file, item } = items[i];
    const statusEl = item.querySelector('.queue-item-status');
    statusEl.textContent = 'Procesando...';
    statusEl.className = 'queue-item-status status-processing';

    try {
      const blob = await imglyRemoveBackground(file, {
        output: { format: 'image/png', quality: 1 }
      });

      statusEl.textContent = '✓ Listo';
      statusEl.className = 'queue-item-status status-done';

      const dlBtn = document.createElement('button');
      dlBtn.style.cssText = 'display:block;width:100%;padding:8px;background:var(--green);color:#080810;border:none;font-size:12px;cursor:pointer;font-weight:600;';
      dlBtn.textContent = 'Descargar';
      dlBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name.replace(/\.[^/.]+$/, '') + '_sin_fondo.png';
        a.click();
      };
      item.appendChild(dlBtn);

    } catch (e) {
      statusEl.textContent = '✗ Error';
      statusEl.className = 'queue-item-status';
      statusEl.style.color = '#ff6b6b';
    }
  }
}

// FAQ accordion
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question').addEventListener('click', () => {
    item.classList.toggle('open');
  });
});
