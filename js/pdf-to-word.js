let resultDocBlob = null;
let originalFileName = '';

const uploadZone     = document.getElementById('uploadZone');
const processingZone = document.getElementById('processingZone');
const resultZone     = document.getElementById('resultZone');
const fileInput      = document.getElementById('fileInput');
const progressFill   = document.getElementById('progressFill');

// Drag & drop + iOS-friendly file input
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => { uploadZone.classList.remove('drag-over'); });
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
  if (files.length) handleFile(files[0]);
});

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  if (files.length) handleFile(files[0]);
  fileInput.value = '';
});

document.querySelector('.btn-upload')?.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });

async function handleFile(file) {
  if (file.size > 50 * 1024 * 1024) { alert('El archivo es muy grande. Máximo 50MB.'); return; }

  originalFileName = file.name.replace(/\.[^/.]+$/, '');

  uploadZone.style.display = 'none';
  processingZone.style.display = 'block';
  resultZone.style.display = 'none';

  document.getElementById('processingTitle').textContent = 'Analizando PDF...';
  document.getElementById('processingMsg').textContent = 'Extrayendo contenido del documento.';

  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    if (totalPages > 100) { alert('El PDF tiene más de 100 páginas. Por seguridad, procesamos hasta 100.'); resetTool(); return; }

    document.getElementById('processingTitle').textContent = `Convirtiendo página 1 de ${totalPages}...`;
    progressFill.style.width = '0%';

    const pageTexts = [];

    for (let i = 1; i <= totalPages; i++) {
      document.getElementById('processingTitle').textContent = `Procesando página ${i} de ${totalPages}...`;

      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map(item => item.str).join(' ').trim();

      if (text.length > 30) {
        pageTexts.push({ type: 'text', content: text });
      } else {
        document.getElementById('processingMsg').textContent = `Página ${i} sin texto extraíble. Aplicando OCR...`;
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        try {
          const { data } = await Tesseract.recognize(canvas, 'spa+eng', {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                const pct = Math.round(m.progress * 100);
                progressFill.style.width = Math.min(pct, 99) + '%';
              }
            }
          });
          pageTexts.push({ type: 'ocr', content: data.text.trim() || '(sin texto reconocido)' });
        } catch (ocrErr) {
          console.error('OCR error en página', i, ocrErr);
          pageTexts.push({ type: 'ocr', content: '' });
        }
      }

      const overallProgress = Math.round((i / totalPages) * 85);
      progressFill.style.width = overallProgress + '%';
    }

    // Build DOCX
    document.getElementById('processingTitle').textContent = 'Generando documento Word...';
    document.getElementById('processingMsg').textContent = 'Esto toma solo unos segundos.';
    progressFill.style.width = '90%';

    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

    const children = [];

    for (let i = 0; i < pageTexts.length; i++) {
      const page = pageTexts[i];
      if (page.content) {
        children.push(
          new Paragraph({
            children: [new TextRun(page.content)],
            spacing: { after: 200 }
          })
        );
      }
    }

    const doc = new Document({
      title: originalFileName,
      description: 'Convertido desde PDF por Pq',
      sections: [{ children }]
    });

    const docBlob = await Packer.toBlob(doc);
    resultDocBlob = docBlob;

    progressFill.style.width = '100%';

    setTimeout(() => {
      processingZone.style.display = 'none';
      resultZone.style.display = 'block';
      document.getElementById('resultInfo').textContent = `PDF convertido exitosamente. ${totalPages} página(s) procesada(s).`;

      if (window.PriqurAnalytics) {
        window.PriqurAnalytics.trackOperation('pdf_to_word', { pages: totalPages, file_size: file.size });
      }
    }, 500);

  } catch (err) {
    console.error('Error convirtiendo PDF:', err);
    document.getElementById('processingTitle').textContent = 'Ocurrió un error';
    document.getElementById('processingMsg').textContent = 'No se pudo procesar el PDF. Intenta con otro archivo.';
    progressFill.style.width = '0%';
    if (window.PriqurAnalytics) window.PriqurAnalytics.trackError('pdf_to_word', err.message);
    setTimeout(resetTool, 3000);
  }
}

document.getElementById('btnDownload')?.addEventListener('click', () => {
  if (!resultDocBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(resultDocBlob);
  a.download = `${originalFileName}.docx`;
  a.click();
  if (window.PriqurAnalytics) window.PriqurAnalytics.trackDownload('pdf_to_word');
});

document.getElementById('btnNewImage')?.addEventListener('click', resetTool);

function resetTool() {
  uploadZone.style.display = 'flex';
  processingZone.style.display = 'none';
  resultZone.style.display = 'none';
  progressFill.style.width = '0%';
  fileInput.value = '';
  resultDocBlob = null;
}

// FAQ accordion
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question').addEventListener('click', () => item.classList.toggle('open'));
});
