import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  TextRun,
} from 'docx';
import { jsPDF } from 'jspdf';
import type {
  EssayDocument,
  EssayVersion,
  ExportStyle,
} from '../types/essay';
import {
  formatDateLabel,
  htmlToMarkdown,
  parseHtmlToBlocks,
} from './textUtils';

function safeFilename(name: string, ext: string): string {
  const cleaned = (name || 'untitled-essay')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return `${cleaned || 'essay'}.${ext}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportToDocx(
  essay: EssayDocument,
  version: EssayVersion,
  options: { style: ExportStyle; includeHeader: boolean }
): Promise<void> {
  const isAcademic = options.style === 'academic';
  const fontName = isAcademic ? 'Times New Roman' : 'Georgia';
  const bodySize = 24; // 12pt in half-points
  const lineSpacing = isAcademic ? 480 : 340; // double vs 1.4x

  const blocks = parseHtmlToBlocks(version.contentHtml);
  const children: Paragraph[] = [];

  const titleText = version.title.trim() || 'Untitled Essay';
  const dateStr = formatDateLabel(version.updatedAt);

  if (options.includeHeader && isAcademic) {
    if (essay.author.trim()) {
      children.push(
        new Paragraph({
          spacing: { after: 120, line: lineSpacing },
          children: [
            new TextRun({
              text: essay.author.trim(),
              font: fontName,
              size: bodySize,
            }),
          ],
        })
      );
    }
    children.push(
      new Paragraph({
        spacing: { after: 240, line: lineSpacing },
        children: [
          new TextRun({
            text: `${dateStr} · ${version.label} (v${version.versionNumber})`,
            font: fontName,
            size: bodySize,
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: isAcademic ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: 120, after: version.subtitle.trim() ? 120 : 320 },
      children: [
        new TextRun({
          text: titleText,
          font: fontName,
          size: isAcademic ? 28 : 40,
          bold: true,
        }),
      ],
    })
  );

  if (version.subtitle.trim()) {
    children.push(
      new Paragraph({
        alignment: isAcademic ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 280 },
        children: [
          new TextRun({
            text: version.subtitle.trim(),
            font: fontName,
            size: 24,
            italics: true,
            color: '52525B',
          }),
        ],
      })
    );
  }

  if (options.includeHeader && !isAcademic && essay.author.trim()) {
    children.push(
      new Paragraph({
        spacing: { after: 320 },
        children: [
          new TextRun({
            text: `By ${essay.author.trim()} · ${dateStr}`,
            font: fontName,
            size: 20,
            color: '71717A',
          }),
        ],
      })
    );
  }

  const mapDocxAlignment = (align?: string) => {
    if (align === 'center') return AlignmentType.CENTER;
    if (align === 'right') return AlignmentType.RIGHT;
    if (align === 'justify') return AlignmentType.JUSTIFIED;
    return AlignmentType.LEFT;
  };

  if (blocks.length === 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '', font: fontName, size: bodySize })],
      })
    );
  } else {
    for (const block of blocks) {
      const runs = block.runs.map(
        (run) =>
          new TextRun({
            text: run.text,
            font: fontName,
            size:
              block.type === 'h1'
                ? 34
                : block.type === 'h2'
                ? 30
                : block.type === 'h3'
                ? 26
                : bodySize,
            bold:
              block.type === 'h1' ||
              block.type === 'h2' ||
              block.type === 'h3' ||
              run.bold,
            italics: block.type === 'blockquote' || run.italic,
            underline: run.underline ? {} : undefined,
            strike: run.strike ? true : undefined,
            color: block.type === 'blockquote' ? '3F3F46' : '18181B',
          })
      );

      const alignment = mapDocxAlignment(block.align);
      const extraLeft = (block.indentLevel || 0) * 540;

      if (block.type === 'h1') {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment,
            indent: extraLeft ? { left: extraLeft } : undefined,
            spacing: { before: 360, after: 160 },
            children: runs,
          })
        );
      } else if (block.type === 'h2') {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            alignment,
            indent: extraLeft ? { left: extraLeft } : undefined,
            spacing: { before: 320, after: 140 },
            children: runs,
          })
        );
      } else if (block.type === 'h3') {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            alignment,
            indent: extraLeft ? { left: extraLeft } : undefined,
            spacing: { before: 240, after: 100 },
            children: runs,
          })
        );
      } else if (block.type === 'blockquote') {
        children.push(
          new Paragraph({
            alignment,
            indent: { left: 720 + extraLeft, right: 360 },
            border: {
              left: {
                color: 'D4D4D8',
                space: 12,
                style: BorderStyle.SINGLE,
                size: 8,
              },
            },
            spacing: { before: 180, after: 200, line: 340 },
            children: runs,
          })
        );
      } else if (block.type === 'ul-li') {
        children.push(
          new Paragraph({
            alignment,
            bullet: { level: Math.min(2, block.indentLevel || 0) },
            spacing: { after: 120, line: lineSpacing },
            children: runs,
          })
        );
      } else if (block.type === 'ol-li') {
        children.push(
          new Paragraph({
            alignment,
            numbering: { reference: 'essay-ordered-list', level: 0 },
            spacing: { after: 120, line: lineSpacing },
            children: runs,
          })
        );
      } else {
        children.push(
          new Paragraph({
            alignment,
            indent:
              isAcademic || extraLeft
                ? {
                    firstLine: isAcademic && !extraLeft ? 720 : undefined,
                    left: extraLeft || undefined,
                  }
                : undefined,
            spacing: { after: isAcademic ? 0 : 200, line: lineSpacing },
            children: runs,
          })
        );
      }
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'essay-ordered-list',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: options.includeHeader
          ? {
              default: new Header({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: essay.author.trim()
                          ? `${essay.author.trim()} · ${titleText}`
                          : titleText,
                        font: fontName,
                        size: 18,
                        color: '71717A',
                      }),
                    ],
                  }),
                ],
              }),
            }
          : undefined,
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: fontName,
                    size: 18,
                    color: '71717A',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(
    blob,
    safeFilename(`${titleText}-v${version.versionNumber}`, 'docx')
  );
}

export function exportToPdf(
  essay: EssayDocument,
  version: EssayVersion,
  options: { style: ExportStyle; includeHeader: boolean }
): void {
  const isAcademic = options.style === 'academic';
  const pdf = new jsPDF({
    unit: 'pt',
    format: 'letter',
    orientation: 'portrait',
  });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 612
  const pageHeight = pdf.internal.pageSize.getHeight(); // 792
  const marginX = 72; // 1 inch
  const marginTop = 72;
  const marginBottom = 72;
  const maxWidth = pageWidth - marginX * 2;
  const fontFamily = 'times';
  const titleText = version.title.trim() || 'Untitled Essay';
  const dateStr = formatDateLabel(version.updatedAt);

  let y = marginTop;

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - marginBottom) {
      pdf.addPage();
      y = marginTop;
    }
  };

  // Academic top-left meta block
  if (options.includeHeader && isAcademic) {
    pdf.setFont(fontFamily, 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(39, 39, 42);
    if (essay.author.trim()) {
      pdf.text(essay.author.trim(), marginX, y);
      y += 18;
    }
    pdf.text(`${dateStr} · v${version.versionNumber}`, marginX, y);
    y += 28;
  }

  // Title
  pdf.setFont(fontFamily, 'bold');
  pdf.setFontSize(isAcademic ? 16 : 22);
  pdf.setTextColor(24, 24, 27);
  const titleLines = pdf.splitTextToSize(titleText, maxWidth) as string[];
  for (const line of titleLines) {
    ensureSpace(26);
    if (isAcademic) {
      pdf.text(line, pageWidth / 2, y, { align: 'center' });
    } else {
      pdf.text(line, marginX, y);
    }
    y += isAcademic ? 22 : 28;
  }

  // Subtitle
  if (version.subtitle.trim()) {
    pdf.setFont(fontFamily, 'italic');
    pdf.setFontSize(12);
    pdf.setTextColor(82, 82, 91);
    const subLines = pdf.splitTextToSize(
      version.subtitle.trim(),
      maxWidth
    ) as string[];
    for (const line of subLines) {
      ensureSpace(18);
      if (isAcademic) {
        pdf.text(line, pageWidth / 2, y, { align: 'center' });
      } else {
        pdf.text(line, marginX, y);
      }
      y += 17;
    }
  }

  if (options.includeHeader && !isAcademic && essay.author.trim()) {
    y += 4;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(113, 113, 122);
    pdf.text(`By ${essay.author.trim()} · ${dateStr}`, marginX, y);
    y += 22;
  } else {
    y += 16;
  }

  // Thin editorial divider under title in editorial mode
  if (!isAcademic) {
    pdf.setDrawColor(228, 228, 231);
    pdf.setLineWidth(0.75);
    pdf.line(marginX, y - 8, pageWidth - marginX, y - 8);
    y += 12;
  }

  const blocks = parseHtmlToBlocks(version.contentHtml);
  let olCounter = 1;

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    const isH1 = block.type === 'h1';
    const isH2 = block.type === 'h2';
    const isH3 = block.type === 'h3';
    const isQuote = block.type === 'blockquote';
    const isUl = block.type === 'ul-li';
    const isOl = block.type === 'ol-li';

    const fontSize = isH1 ? 17 : isH2 ? 15 : isH3 ? 13 : 11.5;
    const lineHeight = isH1
      ? 24
      : isH2
      ? 22
      : isH3
      ? 19
      : isAcademic
      ? 24
      : 18;

    const indentPx = (block.indentLevel || 0) * 24;
    const leftOffset =
      (isQuote ? marginX + 24 : isUl || isOl ? marginX + 20 : marginX) +
      indentPx;
    const blockWidth = Math.max(120, pageWidth - marginX - leftOffset);

    if (isH1) y += 12;
    if (isH2) y += 10;
    if (isH3) y += 6;

    if (isOl) {
      if (bIdx === 0 || blocks[bIdx - 1].type !== 'ol-li') {
        olCounter = 1;
      }
    }

    interface StyledToken {
      text: string;
      style: 'normal' | 'bold' | 'italic' | 'bolditalic';
      underline?: boolean;
      strike?: boolean;
      width: number;
    }

    const tokens: StyledToken[] = [];
    pdf.setFontSize(fontSize);

    if (isUl) {
      pdf.setFont(fontFamily, 'normal');
      tokens.push({
        text: '•  ',
        style: 'normal',
        width: pdf.getTextWidth('•  '),
      });
    } else if (isOl) {
      const numLabel = `${olCounter++}.  `;
      pdf.setFont(fontFamily, 'normal');
      tokens.push({
        text: numLabel,
        style: 'normal',
        width: pdf.getTextWidth(numLabel),
      });
    }

    for (const run of block.runs) {
      const bold = isH1 || isH2 || isH3 || !!run.bold;
      const italic = isQuote || !!run.italic;
      const style: StyledToken['style'] =
        bold && italic
          ? 'bolditalic'
          : bold
          ? 'bold'
          : italic
          ? 'italic'
          : 'normal';

      pdf.setFont(fontFamily, style);
      const parts = run.text.split(/(\s+)/);
      for (const p of parts) {
        if (p) {
          tokens.push({
            text: p,
            style,
            underline: run.underline,
            strike: run.strike,
            width: pdf.getTextWidth(p),
          });
        }
      }
    }

    // Wrap into visual lines so we can support left, center, right, and justified alignment
    const visualLines: { tokens: StyledToken[]; firstLine: boolean }[] = [];
    let currentLine: StyledToken[] = [];
    let currentWidth =
      isAcademic && block.type === 'p' && !block.align && indentPx === 0 ? 28 : 0;

    for (const token of tokens) {
      if (token.text === '\n') {
        visualLines.push({ tokens: currentLine, firstLine: visualLines.length === 0 });
        currentLine = [];
        currentWidth = 0;
        continue;
      }

      if (
        currentWidth + token.width > blockWidth &&
        token.text.trim().length > 0 &&
        currentLine.length > 0
      ) {
        // Trim trailing whitespace token on wrapped line
        while (
          currentLine.length > 0 &&
          !currentLine[currentLine.length - 1].text.trim()
        ) {
          currentLine.pop();
        }
        visualLines.push({ tokens: currentLine, firstLine: visualLines.length === 0 });
        currentLine = [];
        currentWidth = 0;
      }

      if (currentLine.length === 0 && !token.text.trim()) {
        continue;
      }

      currentLine.push(token);
      currentWidth += token.width;
    }
    if (currentLine.length > 0) {
      visualLines.push({ tokens: currentLine, firstLine: visualLines.length === 0 });
    }

    pdf.setFontSize(fontSize);
    pdf.setTextColor(isQuote ? 63 : 24, isQuote ? 63 : 24, isQuote ? 70 : 27);

    const quoteStartY = y - fontSize + 2;

    visualLines.forEach((vLine, lIdx) => {
      ensureSpace(lineHeight);
      const lineTokens = vLine.tokens;
      const contentWidth = lineTokens.reduce((acc, t) => acc + t.width, 0);
      const firstLineAcademicIndent =
        vLine.firstLine && isAcademic && block.type === 'p' && !block.align && indentPx === 0
          ? 28
          : 0;

      let cursorX = leftOffset + firstLineAcademicIndent;
      if (block.align === 'center') {
        cursorX = leftOffset + Math.max(0, (blockWidth - contentWidth) / 2);
      } else if (block.align === 'right') {
        cursorX = leftOffset + Math.max(0, blockWidth - contentWidth);
      }

      const isLastLine = lIdx === visualLines.length - 1;
      const spaceTokens = lineTokens.filter((t) => !t.text.trim());
      const extraSpacePerGap =
        block.align === 'justify' && !isLastLine && spaceTokens.length > 0
          ? Math.max(0, blockWidth - contentWidth) / spaceTokens.length
          : 0;

      for (const token of lineTokens) {
        pdf.setFont(fontFamily, token.style);
        if (!token.text.trim()) {
          cursorX += token.width + extraSpacePerGap;
          continue;
        }
        pdf.text(token.text, cursorX, y);
        if (token.underline) {
          pdf.setDrawColor(24, 24, 27);
          pdf.setLineWidth(0.5);
          pdf.line(cursorX, y + 2, cursorX + token.width, y + 2);
        }
        if (token.strike) {
          pdf.setDrawColor(24, 24, 27);
          pdf.setLineWidth(0.6);
          pdf.line(
            cursorX,
            y - fontSize * 0.3,
            cursorX + token.width,
            y - fontSize * 0.3
          );
        }
        cursorX += token.width;
      }

      y += lineHeight;
    });

    if (isQuote) {
      pdf.setDrawColor(212, 212, 216);
      pdf.setLineWidth(1.5);
      pdf.line(marginX + 10, quoteStartY, marginX + 10, y - lineHeight + 3);
    }

    y += isAcademic ? 2 : 7;
  }

  // Add subtle page headers and page numbers across all pages
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(113, 113, 122);

    if (options.includeHeader && p > 1) {
      const headerLabel = essay.author.trim()
        ? `${essay.author.trim()} · ${titleText}`
        : titleText;
      pdf.text(headerLabel, pageWidth - marginX, 42, { align: 'right' });
    }

    pdf.text(`${p} / ${totalPages}`, pageWidth / 2, pageHeight - 36, {
      align: 'center',
    });
  }

  pdf.save(safeFilename(`${titleText}-v${version.versionNumber}`, 'pdf'));
}

export function exportToMarkdownFile(version: EssayVersion): void {
  const md = htmlToMarkdown(version.title, version.subtitle, version.contentHtml);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  triggerDownload(
    blob,
    safeFilename(`${version.title}-v${version.versionNumber}`, 'md')
  );
}

export function exportToPlainTextFile(version: EssayVersion): void {
  const header = [
    version.title.trim() || 'Untitled Essay',
    version.subtitle.trim(),
  ]
    .filter(Boolean)
    .join('\n');
  const full = header
    ? `${header}\n\n${version.contentText}`
    : version.contentText;
  const blob = new Blob([full], { type: 'text/plain;charset=utf-8' });
  triggerDownload(
    blob,
    safeFilename(`${version.title}-v${version.versionNumber}`, 'txt')
  );
}

export function exportEssayBundle(essay: EssayDocument): void {
  const active =
    essay.versions.find((v) => v.id === essay.activeVersionId) ??
    essay.versions[0];
  const json = JSON.stringify(essay, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  triggerDownload(
    blob,
    safeFilename(active?.title || 'essay-archive', 'folio.json')
  );
}
