// Priquer — background-remover.js
// Procesa imágenes 100% en el navegador con @imgly/background-removal

let resultBlob = null;
let originalFileName = '';

const uploadZone   = document.getElementById('uploadZone');
const processingZone = document.getElementById('processingZone');
const resultZone   = document.getElementById('resultZone');
const fileInput    = document.getElementById('fileInput');
const progressFill = document.getElementById('progressFill');
const originalImg  = document.getElementById('originalImg');
const resultImg    = document.getElementById('resultImg');
const resultImgWrap = resultImg ? resultImg.closest('.result-img-wrap') : null;

// Drag & drop
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

uploadZone.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  if (files.length) handleFiles(files);
});

function handleFiles(files) {
  if (files.length === 1) {
    processImage(files[0]);
  } else {
    processMultiple(files);
  }
}

async function processImage(file) {
  if (file.size > 10 * 1024 * 1024) {
    alert('El archivo es muy grande. Máximo 10MB.');
    return;
  }

  originalFileName = file.name.replace(/\.[^/.]+$/, '');

  // Mostrar original
  const originalUrl = URL.createObjectURL(file);
  originalImg.src = originalUrl;

  // Cambiar a estado processing
  uploadZone.style.display = 'none';
  processingZone.style.display = 'block';
  resultZone.style.display = 'none';

  // Animar progress bar
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 8, 85);
    progressFill.style.width = progress + '%';
  }, 300);

  document.getElementById('processingTitle').textContent = 'Eliminando fondo...';
  document.getElementById('processingMsg').textContent = 'La IA está procesando tu imagen. Esto puede tomar entre 5 y 20 segundos.';

  try {
    // Procesamiento con @imgly/background-removal
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

      // Trackear operación completada
      if (window.PriqurAnalytics) {
        window.PriqurAnalytics.trackOperation('background_remover');
      }

      // Setup download button
      document.getElementById('btnDownload').onclick = () => downloadResult();

    }, 600);

  } catch (err) {
    clearInterval(progressInterval);
    console.error('Error procesando imagen:', err);
    document.getElementById('processingTitle').textContent = 'Ocurrió un error';
    document.getElementById('processingMsg').textContent = 'No se pudo procesar la imagen. Intenta con otra imagen o recarga la página.';
    progressFill.style.width = '0%';

    setTimeout(resetTool, 3000);
  }
}

function downloadResult() {
  if (!resultBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(resultBlob);
  a.download = `${originalFileName}_sin_fondo.png`;
  a.click();

  if (window.PriqurAnalytics) {
    window.PriqurAnalytics.trackEvent('herramienta', 'descarga', 'background_remover');
  }
}

function resetTool() {
  uploadZone.style.display = 'flex';
  processingZone.style.display = 'none';
  resultZone.style.display = 'none';
  progressFill.style.width = '0%';
  fileInput.value = '';
  resultBlob = null;
  originalFileName = '';

  // Reset bg preview
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
    } else {
      resultImgWrap.style.background = bg;
      resultImgWrap.style.backgroundImage = 'none';
    }
  });
});

// Procesar múltiples imágenes
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

  // Procesar el primero en el área principal
  processImage(files[0]);

  // Procesar el resto en paralelo y ofrecer descarga individual
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
      dlBtn.style.cssText = 'display:block;width:100%;padding:6px;background:var(--accent);color:white;border:none;font-size:11px;cursor:pointer;font-family:var(--font-body);';
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
