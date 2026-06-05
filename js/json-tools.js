let currentJson = null;
let currentError = null;
let currentView = 'tree';

const jsonInput = document.getElementById('jsonInput');
const jsonTreeView = document.getElementById('jsonTreeView');
const jsonConvertOutput = document.getElementById('jsonConvertOutput');
const jsonStatus = document.getElementById('jsonStatus');
const jsonFileInput = document.getElementById('jsonFileInput');

// Auto-format on input with debounce
let formatTimeout;
jsonInput.addEventListener('input', () => {
  clearTimeout(formatTimeout);
  formatTimeout = setTimeout(() => { validateJSON(); updateView(); }, 600);
});

// Tab support in textarea
jsonInput.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = jsonInput.selectionStart;
    const end = jsonInput.selectionEnd;
    jsonInput.value = jsonInput.value.substring(0, start) + '  ' + jsonInput.value.substring(end);
    jsonInput.selectionStart = jsonInput.selectionEnd = start + 2;
  }
});

// File upload
jsonFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    jsonInput.value = ev.target.result;
    validateJSON();
    updateView();
    if (window.PriqurAnalytics) window.PriqurAnalytics.trackEvent('json', 'file_loaded', file.name);
  };
  reader.readAsText(file);
  jsonFileInput.value = '';
});

// Upload zone click
document.getElementById('jsonUploadZone')?.addEventListener('click', () => jsonFileInput.click());

// Drag & drop on upload zone
const uploadZoneJSON = document.getElementById('jsonUploadZone');
uploadZoneJSON.addEventListener('dragover', (e) => { e.preventDefault(); uploadZoneJSON.style.borderColor = 'var(--green)'; });
uploadZoneJSON.addEventListener('dragleave', () => { uploadZoneJSON.style.borderColor = ''; });
uploadZoneJSON.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZoneJSON.style.borderColor = '';
  const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/json' || f.name.endsWith('.json'));
  if (files.length) {
    const reader = new FileReader();
    reader.onload = (ev) => { jsonInput.value = ev.target.result; validateJSON(); updateView(); };
    reader.readAsText(files[0]);
  }
});

function parseJSON() {
  try {
    currentJson = JSON.parse(jsonInput.value);
    currentError = null;
    return true;
  } catch (e) {
    currentError = e.message;
    currentJson = null;
    return false;
  }
}

function validateJSON() {
  if (!jsonInput.value.trim()) {
    jsonStatus.textContent = 'Esperando entrada...';
    jsonStatus.className = 'status';
    return false;
  }

  if (parseJSON()) {
    jsonStatus.textContent = '✓ JSON válido';
    jsonStatus.className = 'status ok';
    return true;
  } else {
    jsonStatus.textContent = `✗ ${currentError}`;
    jsonStatus.className = 'status err';
    return false;
  }
}

function formatJSON() {
  if (!jsonInput.value.trim()) return;
  if (!parseJSON()) { validateJSON(); return; }
  jsonInput.value = JSON.stringify(currentJson, null, 2);
  validateJSON();
  updateView();
}

function minifyJSON() {
  if (!jsonInput.value.trim()) return;
  if (!parseJSON()) { validateJSON(); return; }
  jsonInput.value = JSON.stringify(currentJson);
  validateJSON();
  updateView();
}

function showEditor() {
  currentView = 'editor';
  document.getElementById('btnTree').classList.remove('active');
  document.getElementById('btnEditor').classList.add('active');
  jsonInput.style.display = 'block';
  jsonTreeView.style.display = 'none';
  jsonConvertOutput.style.display = 'none';
}

function showTree() {
  currentView = 'tree';
  document.getElementById('btnTree').classList.add('active');
  document.getElementById('btnEditor').classList.remove('active');
  jsonInput.style.display = 'none';
  jsonTreeView.style.display = 'block';
  jsonConvertOutput.style.display = 'none';
  if (parseJSON()) {
    jsonTreeView.innerHTML = renderTree(currentJson);
  }
}

function updateView() {
  if (currentView === 'tree' && parseJSON()) {
    jsonTreeView.innerHTML = renderTree(currentJson);
  }
  jsonConvertOutput.style.display = 'none';
}

function renderTree(data, key = '') {
  if (data === null) return `<span class="tree-node"><span class="tree-key">${key}</span>: <span class="tree-null">null</span></span>`;
  if (typeof data === 'string') return `<span class="tree-node"><span class="tree-key">${key}</span>: <span class="tree-string">"${escapeHTML(data)}"</span></span>`;
  if (typeof data === 'number') return `<span class="tree-node"><span class="tree-key">${key}</span>: <span class="tree-number">${data}</span></span>`;
  if (typeof data === 'boolean') return `<span class="tree-node"><span class="tree-key">${key}</span>: <span class="tree-boolean">${data}</span></span>`;

  let html = '';
  const isArray = Array.isArray(data);
  const entries = isArray ? data : Object.keys(data);
  const label = isArray ? `Array [${data.length}]` : `Object {${Object.keys(data).length}}`;
  const id = 'node_' + Math.random().toString(36).slice(2);

  html += `<div class="tree-node">
    <span class="tree-toggle" onclick="toggleTree('${id}')">▼</span>
    <span class="tree-key">${key || (isArray ? '[]' : '{}')}</span>
    <span class="tree-bracket">${isArray ? '[' : '{'}</span>
    <span id="${id}_collapsed" style="display:none" class="tree-collapsed">${label} ... ${isArray ? ']' : '}'}</span>
  </div>
  <div id="${id}">`;

  const itemKeys = isArray ? data.map((_, i) => i) : Object.keys(data);

  itemKeys.forEach((k, i) => {
    const val = data[k];
    const displayKey = isArray ? k : `"${k}"`;
    if (val !== null && typeof val === 'object') {
      html += renderTree(val, displayKey);
    } else {
      html += `<div class="tree-node">`;
      if (val === null) html += `<span class="tree-key">${displayKey}</span>: <span class="tree-null">null</span>`;
      else if (typeof val === 'string') html += `<span class="tree-key">${displayKey}</span>: <span class="tree-string">"${escapeHTML(val)}"</span>`;
      else if (typeof val === 'number') html += `<span class="tree-key">${displayKey}</span>: <span class="tree-number">${val}</span>`;
      else if (typeof val === 'boolean') html += `<span class="tree-key">${displayKey}</span>: <span class="tree-boolean">${val}</span>`;
      html += `</div>`;
    }
    if (i < itemKeys.length - 1) html += `<span class="tree-bracket">,</span>`;
  });

  html += `</div>
  <div class="tree-node"><span class="tree-bracket">${isArray ? ']' : '}'}</span></div>`;

  return html;
}

function toggleTree(id) {
  const el = document.getElementById(id);
  const collapsed = document.getElementById(id + '_collapsed');
  const toggle = el.previousElementSibling?.querySelector('.tree-toggle');
  if (el.style.display === 'none') {
    el.style.display = 'block';
    if (collapsed) collapsed.style.display = 'none';
    if (toggle) toggle.textContent = '▼';
  } else {
    el.style.display = 'none';
    if (collapsed) collapsed.style.display = 'inline';
    if (toggle) toggle.textContent = '▶';
  }
}

function escapeHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function copyJSON() {
  if (!jsonInput.value.trim()) return;
  navigator.clipboard.writeText(jsonInput.value).then(() => {
    jsonStatus.textContent = '✓ Copiado al portapapeles';
    jsonStatus.className = 'status ok';
    setTimeout(() => validateJSON(), 2000);
  }).catch(() => {
    jsonStatus.textContent = '✗ No se pudo copiar';
    jsonStatus.className = 'status err';
  });
}

function downloadJSON() {
  if (!jsonInput.value.trim()) return;
  const blob = new Blob([jsonInput.value], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'datos.json';
  a.click();
}

function convertTo(format) {
  if (!parseJSON()) { validateJSON(); return; }

  let output = '';
  let mimeType = 'text/plain';
  let filename = `datos.${format}`;

  switch (format) {
    case 'csv':
      output = jsonToCsv(currentJson);
      mimeType = 'text/csv';
      break;
    case 'yaml':
      if (typeof jsyaml !== 'undefined') {
        output = jsyaml.dump(currentJson, { indent: 2, lineWidth: -1, noRefs: true });
      } else {
        output = 'Error: Librería YAML no disponible';
      }
      mimeType = 'text/yaml';
      filename = 'datos.yaml';
      break;
    case 'xml':
      output = jsonToXml(currentJson);
      mimeType = 'text/xml';
      filename = 'datos.xml';
      break;
  }

  jsonConvertOutput.textContent = output;
  jsonConvertOutput.style.display = 'block';
  jsonInput.style.display = 'none';
  jsonTreeView.style.display = 'none';
  currentView = 'convert';
  document.getElementById('btnTree').classList.remove('active');
  document.getElementById('btnEditor').classList.remove('active');

  // Add download button for converted output
  const pre = document.createElement('pre');
  pre.style.cssText = 'margin:0;white-space:pre-wrap;word-break:break-word;';
  pre.textContent = output;

  const dlBtn = document.createElement('button');
  dlBtn.textContent = `⬇ Descargar ${format.toUpperCase()}`;
  dlBtn.style.cssText = 'margin-top:12px;background:var(--green);color:#080810;border:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;';
  dlBtn.onclick = () => downloadText(output, filename);

  jsonConvertOutput.innerHTML = '';
  jsonConvertOutput.appendChild(pre);
  jsonConvertOutput.appendChild(dlBtn);
}

function downloadText(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function jsonToCsv(data) {
  if (Array.isArray(data)) {
    return arrayToCsv(data);
  } else if (typeof data === 'object' && data !== null) {
    // Wrap single object in array
    return arrayToCsv([data]);
  }
  return String(data);
}

function arrayToCsv(arr) {
  if (!arr.length) return '';
  const keys = new Set();
  arr.forEach(item => {
    if (item && typeof item === 'object') Object.keys(item).forEach(k => keys.add(k));
  });
  const headers = [...keys];
  const lines = [headers.join(',')];
  arr.forEach(item => {
    const row = headers.map(h => {
      const val = item && item[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    });
    lines.push(row.join(','));
  });
  return lines.join('\n');
}

function jsonToXml(data, root = 'root') {
  if (root === 'root' && !Array.isArray(data) && typeof data === 'object' && data !== null) {
    root = 'root';
  }

  let xml = '';
  const indent = '  ';

  function toXml(val, name, depth) {
    const pad = indent.repeat(depth);
    if (val === null || val === undefined) {
      return `${pad}<${name}/>\n`;
    }
    if (typeof val === 'string') {
      return `${pad}<${name}>${escapeXML(val)}</${name}>\n`;
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
      return `${pad}<${name}>${val}</${name}>\n`;
    }
    if (Array.isArray(val)) {
      let out = '';
      val.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          const tagName = name.replace(/s$/, '') || 'item';
          out += `${pad}<${tagName}>\n`;
          Object.keys(item).forEach(k => {
            out += toXml(item[k], k, depth + 1);
          });
          out += `${pad}</${tagName}>\n`;
        } else {
          out += toXml(item, name, depth);
        }
      });
      return out;
    }
    if (typeof val === 'object') {
      let out = `${pad}<${name}>\n`;
      Object.keys(val).forEach(k => {
        out += toXml(val[k], k, depth + 1);
      });
      out += `${pad}</${name}>\n`;
      return out;
    }
    return '';
  }

  xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += toXml(data, root, 0);
  return xml;
}

function escapeXML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Initialize
validateJSON();
updateView();

// FAQ accordion
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-question').addEventListener('click', () => item.classList.toggle('open'));
});
