import mammoth from 'mammoth';
import type { EssayDocument, EssayVersion } from '../types/essay';
import {
  htmlToPlainText,
  plainTextToHtml,
  sanitizeEditorHtml,
} from './textUtils';

export interface ImportedEssayResult {
  kind: 'bundle' | 'single';
  essay?: EssayDocument;
  title?: string;
  contentHtml?: string;
  contentText?: string;
}

function stripExtension(filename: string): string {
  return filename
    .replace(/\.(folio\.json|json|docx|md|markdown|txt|html|htm)$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

export async function importEssayFromFile(
  file: File
): Promise<ImportedEssayResult> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.json')) {
    const raw = await file.text();
    const parsed = JSON.parse(raw) as Partial<EssayDocument>;
    if (
      parsed &&
      Array.isArray(parsed.versions) &&
      parsed.versions.length > 0 &&
      typeof parsed.id === 'string'
    ) {
      const normalizedVersions: EssayVersion[] = parsed.versions.map((v, i) => ({
        id: v.id || `ver-${Date.now()}-${i}`,
        versionNumber: v.versionNumber || i + 1,
        label: v.label || `Version ${i + 1}`,
        title: v.title || 'Untitled Essay',
        subtitle: v.subtitle || '',
        contentHtml: sanitizeEditorHtml(v.contentHtml || ''),
        contentText:
          v.contentText || htmlToPlainText(v.contentHtml || ''),
        createdAt: v.createdAt || new Date().toISOString(),
        updatedAt: v.updatedAt || new Date().toISOString(),
        parentVersionId: v.parentVersionId ?? null,
        creationMode: v.creationMode || 'imported',
        notes: v.notes || '',
      }));

      const doc: EssayDocument = {
        id: `essay-${Date.now()}`,
        author: parsed.author || '',
        wordGoal: parsed.wordGoal || 1200,
        thesis: parsed.thesis || '',
        outline: Array.isArray(parsed.outline) ? parsed.outline : [],
        scratchpad: parsed.scratchpad || '',
        versions: normalizedVersions,
        activeVersionId:
          parsed.activeVersionId &&
          normalizedVersions.some((v) => v.id === parsed.activeVersionId)
            ? parsed.activeVersionId
            : normalizedVersions[normalizedVersions.length - 1].id,
        referenceVersionId: parsed.referenceVersionId ?? null,
        createdAt: parsed.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { kind: 'bundle', essay: doc };
    }
    throw new Error('Unrecognized JSON structure. Expected a Folio essay archive.');
  }

  if (lower.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const sanitized = sanitizeEditorHtml(result.value);
    const contentText = htmlToPlainText(sanitized);
    return {
      kind: 'single',
      title: stripExtension(file.name) || 'Imported Document',
      contentHtml: sanitized,
      contentText,
    };
  }

  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    const raw = await file.text();
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(raw, 'text/html');
    const titleEl = parsedDoc.querySelector('h1, title');
    const title = titleEl?.textContent?.trim() || stripExtension(file.name);
    const sanitized = sanitizeEditorHtml(parsedDoc.body.innerHTML);
    return {
      kind: 'single',
      title,
      contentHtml: sanitized,
      contentText: htmlToPlainText(sanitized),
    };
  }

  // .txt or .md
  const text = await file.text();
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let title = stripExtension(file.name) || 'Imported Essay';
  let bodyText = text;

  const firstNonEmptyIdx = lines.findIndex((l) => l.trim().length > 0);
  if (firstNonEmptyIdx !== -1) {
    const firstLine = lines[firstNonEmptyIdx].trim();
    if (firstLine.startsWith('# ')) {
      title = firstLine.slice(2).trim();
      bodyText = lines.slice(firstNonEmptyIdx + 1).join('\n');
    }
  }

  const contentHtml = plainTextToHtml(bodyText);
  return {
    kind: 'single',
    title,
    contentHtml,
    contentText: htmlToPlainText(contentHtml),
  };
}
