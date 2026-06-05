window.pdfLayout = (function () {
  function groupLines(items, styles) {
    if (!items || items.length === 0) return [];

    const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5]);

    const lines = [];
    let curY = sorted[0].transform[5];
    let curLine = { y: curY, items: [] };

    for (const item of sorted) {
      const y = item.transform[5];
      const style = styles[item.fontName];
      const threshold = style ? style.fontSize * 0.4 : 4;

      if (Math.abs(y - curY) > threshold) {
        if (curLine.items.length > 0) {
          lines.push(curLine);
        }
        curY = y;
        curLine = { y, items: [] };
      }
      curLine.items.push(item);
    }
    if (curLine.items.length > 0) {
      lines.push(curLine);
    }

    for (const line of lines) {
      line.items.sort((a, b) => a.transform[4] - b.transform[4]);
    }

    return lines;
  }

  function isBold(fontName) {
    return /bold|heavy|black|demi|bd$/i.test(fontName);
  }

  function isItalic(fontName) {
    return /italic|oblique|obliq|slanted|it$/i.test(fontName);
  }

  function getFontSize(item, styles) {
    const style = styles[item.fontName];
    if (style && style.fontSize) return style.fontSize;
    return item.height || 12;
  }

  function getFontFamily(item, styles) {
    const style = styles[item.fontName];
    return style ? style.fontFamily : undefined;
  }

  function detectListType(text) {
    const t = text.trim();
    if (/^[-•*→▪●○■]/.test(t)) return 'bullet';
    if (/^\d+[.)]/.test(t)) return 'numbered';
    if (/^[a-zA-Z][.)]/.test(t)) return 'numbered';
    if (/^\([a-zA-Z0-9]\)/.test(t)) return 'numbered';
    return null;
  }

  function isLikelyPageNumber(text, y, pageHeight) {
    const t = text.trim();
    if (!/^\d{1,4}$/.test(t)) return false;
    return y < 50 || y > pageHeight - 50;
  }

  function parseLayout(textContent, pageHeight) {
    const { items, styles } = textContent;
    if (!items || items.length === 0) return [];

    const lines = groupLines(items, styles);

    const sizes = [];
    for (const line of lines) {
      for (const item of line.items) {
        sizes.push(getFontSize(item, styles));
      }
    }
    sizes.sort((a, b) => a - b);
    const median = sizes.length > 0 ? sizes[Math.floor(sizes.length / 2)] : 12;

    const paragraphs = [];
    let currentPara = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];

      let maxSize = 0;
      for (const item of line.items) {
        const sz = getFontSize(item, styles);
        maxSize = Math.max(maxSize, sz);
      }

      const lineText = line.items.map(item => item.str).join('');

      if (isLikelyPageNumber(lineText, line.y, pageHeight || 800)) continue;

      const headingLevel = maxSize >= median * 1.7 ? 1 : maxSize >= median * 1.3 ? 2 : maxSize >= median * 1.15 ? 3 : null;
      const listType = headingLevel ? null : detectListType(lineText);

      const runs = [];
      for (let j = 0; j < line.items.length; j++) {
        const item = line.items[j];
        const sz = getFontSize(item, styles);
        let text = item.str;

        const nextItem = line.items[j + 1];
        if (nextItem) {
          const xEnd = item.transform[4] + item.width;
          const nextX = nextItem.transform[4];
          if (nextX > xEnd) {
            text += ' ';
          }
        }

        runs.push({
          text: text,
          bold: isBold(item.fontName),
          italic: isItalic(item.fontName),
          size: Math.round(sz * 2),
          font: getFontFamily(item, styles),
        });
      }

      const gap = nextLine ? (line.y - nextLine.y) : 0;

      if (headingLevel) {
        paragraphs.push({ type: 'heading', level: headingLevel, runs: runs });
        currentPara = null;
      } else if (listType) {
        paragraphs.push({ type: 'list', listType: listType, runs: runs });
        currentPara = null;
      } else if (currentPara && gap > 0 && gap < maxSize * 1.5) {
        if (currentPara.runs.length > 0) {
          currentPara.runs.push({ text: ' ', bold: false, italic: false, size: undefined, font: undefined });
        }
        currentPara.runs.push(...runs);
      } else {
        currentPara = { type: 'paragraph', runs: runs };
        paragraphs.push(currentPara);
      }
    }

    return paragraphs;
  }

  return { parseLayout };
})();
