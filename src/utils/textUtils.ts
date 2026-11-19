export interface InlineRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
}

export type BlockType = 'h1' | 'h2' | 'h3' | 'p' | 'blockquote' | 'ul-li' | 'ol-li';
export type BlockAlign = 'left' | 'center' | 'right' | 'justify';

export interface StructuredBlock {
  type: BlockType;
  runs: InlineRun[];
  text: string;
  align?: BlockAlign;
  indentLevel?: number;
}

export interface TextMetrics {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingMinutes: number;
}

const ALLOWED_TAGS = new Set([
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'BLOCKQUOTE',
  'UL',
  'OL',
  'LI',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'STRIKE',
  'DEL',
  'BR',
  'DIV',
  'SPAN',
]);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractSafeBlockStyle(el: HTMLElement): string {
  const styles: string[] = [];
  const alignAttr = el.getAttribute('align')?.toLowerCase();
  const inlineStyle = el.getAttribute('style') || '';

  const alignMatch = inlineStyle.match(/text-align\s*:\s*(left|center|right|justify)/i);
  const align = (alignMatch?.[1] || alignAttr || '').toLowerCase();
  if (align === 'left' || align === 'center' || align === 'right' || align === 'justify') {
    if (align !== 'left') {
      styles.push(`text-align: ${align}`);
    }
  }

  const marginMatch = inlineStyle.match(/(?:margin-left|padding-left)\s*:\s*(\d+(?:\.\d+)?)(px|pt|em|rem)/i);
  if (marginMatch) {
    const val = parseFloat(marginMatch[1]);
    if (val > 0) {
      styles.push(`margin-left: ${Math.min(160, val)}${marginMatch[2]}`);
    }
  }

  return styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
}

function parseBlockAlign(el: Element): BlockAlign | undefined {
  const htmlEl = el as HTMLElement;
  const alignAttr = htmlEl.getAttribute('align')?.toLowerCase();
  const inlineAlign = htmlEl.style?.textAlign?.toLowerCase();
  const align = inlineAlign || alignAttr;
  if (align === 'center' || align === 'right' || align === 'justify' || align === 'left') {
    return align;
  }
  return undefined;
}

function parseIndentLevel(el: Element): number {
  const htmlEl = el as HTMLElement;
  const marginStr = htmlEl.style?.marginLeft || htmlEl.style?.paddingLeft || '';
  const match = marginStr.match(/(\d+(?:\.\d+)?)(px|pt|em|rem)/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  const px = unit === 'em' || unit === 'rem' ? num * 16 : unit === 'pt' ? num * 1.33 : num;
  return Math.min(4, Math.max(0, Math.round(px / 32)));
}

export function sanitizeEditorHtml(rawHtml: string): string {
  if (!rawHtml || !rawHtml.trim()) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';

  function cleanNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }
    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();
    const childrenHtml = Array.from(el.childNodes).map(cleanNode).join('');

    if (!ALLOWED_TAGS.has(tag)) {
      if (tag === 'SCRIPT' || tag === 'STYLE') return '';
      return childrenHtml;
    }

    if (tag === 'BR') return '<br>';
    const styleAttr = extractSafeBlockStyle(el);

    if (tag === 'DIV') {
      return childrenHtml.trim() ? `<p${styleAttr}>${childrenHtml}</p>` : '';
    }
    if (tag === 'H1') return `<h1${styleAttr}>${childrenHtml}</h1>`;
    if (tag === 'H2') return `<h2${styleAttr}>${childrenHtml}</h2>`;
    if (tag === 'H3' || tag === 'H4') return `<h3${styleAttr}>${childrenHtml}</h3>`;
    if (tag === 'B') return `<strong>${childrenHtml}</strong>`;
    if (tag === 'I') return `<em>${childrenHtml}</em>`;
    if (tag === 'STRIKE' || tag === 'DEL') return `<s>${childrenHtml}</s>`;
    if (tag === 'SPAN') {
      const style = el.getAttribute('style') || '';
      let wrapped = childrenHtml;
      if (/font-weight\s*:\s*(bold|[6-9]00)/i.test(style)) {
        wrapped = `<strong>${wrapped}</strong>`;
      }
      if (/font-style\s*:\s*italic/i.test(style)) {
        wrapped = `<em>${wrapped}</em>`;
      }
      if (/text-decoration[^;]*underline/i.test(style)) {
        wrapped = `<u>${wrapped}</u>`;
      }
      if (/text-decoration[^;]*line-through/i.test(style)) {
        wrapped = `<s>${wrapped}</s>`;
      }
      return wrapped;
    }

    const lower = tag.toLowerCase();
    const blockWithStyle =
      tag === 'P' || tag === 'BLOCKQUOTE' || tag === 'LI' ? styleAttr : '';
    return `<${lower}${blockWithStyle}>${childrenHtml}</${lower}>`;
  }

  return Array.from(root.childNodes).map(cleanNode).join('');
}

export function parseHtmlToBlocks(html: string): StructuredBlock[] {
  if (!html || !html.trim()) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return [];

  const blocks: StructuredBlock[] = [];

  function extractRuns(
    node: Node,
    formatting: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      strike?: boolean;
    } = {}
  ): InlineRun[] {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (!text) return [];
      return [{ text, ...formatting }];
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return [];
    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();
    if (tag === 'BR') return [{ text: '\n', ...formatting }];

    const nextFmt = { ...formatting };
    if (tag === 'STRONG' || tag === 'B') nextFmt.bold = true;
    if (tag === 'EM' || tag === 'I') nextFmt.italic = true;
    if (tag === 'U') nextFmt.underline = true;
    if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') nextFmt.strike = true;

    const runs: InlineRun[] = [];
    for (const child of Array.from(el.childNodes)) {
      runs.push(...extractRuns(child, nextFmt));
    }
    return runs;
  }

  function mergeRuns(runs: InlineRun[]): InlineRun[] {
    const merged: InlineRun[] = [];
    for (const run of runs) {
      if (!run.text) continue;
      const prev = merged[merged.length - 1];
      if (
        prev &&
        !!prev.bold === !!run.bold &&
        !!prev.italic === !!run.italic &&
        !!prev.underline === !!run.underline &&
        !!prev.strike === !!run.strike
      ) {
        prev.text += run.text;
      } else {
        merged.push({ ...run });
      }
    }
    return merged;
  }

  function pushBlock(type: BlockType, el: Node, extraIndent = 0) {
    const runs = mergeRuns(extractRuns(el));
    const text = runs.map((r) => r.text).join('').replace(/\u00a0/g, ' ').trim();
    if (text) {
      const elem = el.nodeType === Node.ELEMENT_NODE ? (el as Element) : null;
      const align = elem ? parseBlockAlign(elem) : undefined;
      const indentLevel = (elem ? parseIndentLevel(elem) : 0) + extraIndent;
      blocks.push({ type, runs, text, align, indentLevel });
    }
  }

  let inlineBuffer: Node[] = [];
  const flushInlineBuffer = () => {
    if (inlineBuffer.length === 0) return;
    const wrapper = doc.createElement('p');
    inlineBuffer.forEach((n) => wrapper.appendChild(n.cloneNode(true)));
    pushBlock('p', wrapper);
    inlineBuffer = [];
  };

  function processElement(el: HTMLElement, extraIndent = 0) {
    const tag = el.tagName.toUpperCase();

    if (tag === 'H1') {
      flushInlineBuffer();
      pushBlock('h1', el, extraIndent);
    } else if (tag === 'H2') {
      flushInlineBuffer();
      pushBlock('h2', el, extraIndent);
    } else if (tag === 'H3' || tag === 'H4') {
      flushInlineBuffer();
      pushBlock('h3', el, extraIndent);
    } else if (tag === 'BLOCKQUOTE') {
      flushInlineBuffer();
      const style = el.getAttribute('style') || '';
      // execCommand('indent') often wraps paragraphs in <blockquote style="margin: 0 0 0 40px; border: none; padding: 0px;">
      const isIndentWrapper =
        /border\s*:\s*none/i.test(style) ||
        (/margin-left|margin\s*:/i.test(style) && el.querySelector('p, h1, h2, h3, div'));
      if (isIndentWrapper) {
        Array.from(el.children).forEach((child) =>
          processElement(child as HTMLElement, extraIndent + 1)
        );
      } else {
        pushBlock('blockquote', el, extraIndent);
      }
    } else if (tag === 'UL') {
      flushInlineBuffer();
      Array.from(el.children).forEach((li) => {
        if (li.tagName.toUpperCase() === 'LI') {
          pushBlock('ul-li', li, extraIndent);
        }
      });
    } else if (tag === 'OL') {
      flushInlineBuffer();
      Array.from(el.children).forEach((li) => {
        if (li.tagName.toUpperCase() === 'LI') {
          pushBlock('ol-li', li, extraIndent);
        }
      });
    } else if (tag === 'P' || tag === 'DIV') {
      flushInlineBuffer();
      pushBlock('p', el, extraIndent);
    } else {
      inlineBuffer.push(el);
    }
  }

  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      if ((child.textContent || '').trim()) {
        inlineBuffer.push(child);
      }
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    processElement(child as HTMLElement);
  }

  flushInlineBuffer();
  return blocks;
}

export function htmlToPlainText(html: string): string {
  const blocks = parseHtmlToBlocks(html);
  if (blocks.length === 0) return '';
  let olCounter = 1;
  return blocks
    .map((block, index) => {
      if (block.type === 'ol-li') {
        if (index === 0 || blocks[index - 1].type !== 'ol-li') {
          olCounter = 1;
        }
        return `${olCounter++}. ${block.text}`;
      }
      if (block.type === 'ul-li') {
        return `• ${block.text}`;
      }
      return block.text;
    })
    .join('\n\n');
}

function inlineMarkdownToHtml(text: string): string {
  let escaped = escapeHtml(text);
  escaped = escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/__(.+?)__/g, '<u>$1</u>');
  escaped = escaped.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return escaped;
}

export function plainTextToHtml(rawText: string): string {
  const normalized = rawText.replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';
  const lines = normalized.split('\n');
  const htmlParts: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      htmlParts.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      htmlParts.push('</ol>');
      inOl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeLists();
      continue;
    }

    if (line.startsWith('### ')) {
      closeLists();
      htmlParts.push(`<h3>${inlineMarkdownToHtml(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ') || line.startsWith('# ')) {
      closeLists();
      const content = line.startsWith('## ') ? line.slice(3) : line.slice(2);
      htmlParts.push(`<h2>${inlineMarkdownToHtml(content)}</h2>`);
    } else if (line.startsWith('> ')) {
      closeLists();
      htmlParts.push(`<blockquote>${inlineMarkdownToHtml(line.slice(2))}</blockquote>`);
    } else if (/^[-*•]\s+/.test(line)) {
      if (inOl) {
        htmlParts.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        htmlParts.push('<ul>');
        inUl = true;
      }
      htmlParts.push(`<li>${inlineMarkdownToHtml(line.replace(/^[-*•]\s+/, ''))}</li>`);
    } else if (/^\d+\.\s+/.test(line)) {
      if (inUl) {
        htmlParts.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        htmlParts.push('<ol>');
        inOl = true;
      }
      htmlParts.push(`<li>${inlineMarkdownToHtml(line.replace(/^\d+\.\s+/, ''))}</li>`);
    } else {
      closeLists();
      htmlParts.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
    }
  }

  closeLists();
  return htmlParts.join('');
}

export function htmlToMarkdown(title: string, subtitle: string, html: string): string {
  const blocks = parseHtmlToBlocks(html);
  const parts: string[] = [];

  if (title.trim()) {
    parts.push(`# ${title.trim()}`);
  }
  if (subtitle.trim()) {
    parts.push(`*${subtitle.trim()}*`);
  }

  let olCounter = 1;
  blocks.forEach((block, index) => {
    const formatted = block.runs
      .map((run) => {
        let t = run.text;
        if (run.bold) t = `**${t}**`;
        if (run.italic) t = `*${t}*`;
        if (run.underline) t = `__${t}__`;
        return t;
      })
      .join('');

    if (block.type === 'h2') parts.push(`## ${formatted}`);
    else if (block.type === 'h3') parts.push(`### ${formatted}`);
    else if (block.type === 'blockquote') parts.push(`> ${formatted}`);
    else if (block.type === 'ul-li') parts.push(`- ${formatted}`);
    else if (block.type === 'ol-li') {
      if (index === 0 || blocks[index - 1].type !== 'ol-li') {
        olCounter = 1;
      }
      parts.push(`${olCounter++}. ${formatted}`);
    } else {
      parts.push(formatted);
    }
  });

  return parts.join('\n\n');
}

export function getTextMetrics(text: string): TextMetrics {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      readingMinutes: 0,
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const characters = trimmed.length;
  const charactersNoSpaces = trimmed.replace(/\s/g, '').length;
  const sentences = trimmed
    .split(/[.!?]+(?=\s|$)/)
    .map((s) => s.trim())
    .filter(Boolean).length;
  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(words / 225));

  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs,
    readingMinutes,
  };
}

export function formatShortTime(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function formatDateLabel(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}
