import React, { useState } from 'react';
import { Check, Download, FileArchive, FileCode, FileText, X } from 'lucide-react';
import type {
  EssayDocument,
  ExportFormat,
  ExportStyle,
} from '../types/essay';
import {
  exportEssayBundle,
  exportToDocx,
  exportToMarkdownFile,
  exportToPdf,
  exportToPlainTextFile,
} from '../utils/exporters';
import { formatDateLabel, getTextMetrics } from '../utils/textUtils';

interface ExportModalProps {
  essay: EssayDocument;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ essay, onClose }) => {
  const [selectedVersionId, setSelectedVersionId] = useState(
    essay.activeVersionId
  );
  const [format, setFormat] = useState<ExportFormat>('docx');
  const [style, setStyle] = useState<ExportStyle>('editorial');
  const [includeHeader, setIncludeHeader] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedVersion =
    essay.versions.find((v) => v.id === selectedVersionId) ??
    essay.versions[0];

  const metrics = getTextMetrics(selectedVersion.contentText);

  const handleExport = async () => {
    setErrorMsg(null);
    setExporting(true);
    try {
      if (format === 'docx') {
        await exportToDocx(essay, selectedVersion, { style, includeHeader });
      } else if (format === 'pdf') {
        exportToPdf(essay, selectedVersion, { style, includeHeader });
      } else if (format === 'markdown') {
        exportToMarkdownFile(selectedVersion);
      } else if (format === 'txt') {
        exportToPlainTextFile(selectedVersion);
      } else if (format === 'bundle') {
        exportEssayBundle(essay);
      }
      setExportedFormat(format.toUpperCase());
      setTimeout(() => setExportedFormat(null), 2200);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to export document.'
      );
    } finally {
      setExporting(false);
    }
  };

  const formatOptions: {
    id: ExportFormat;
    label: string;
    ext: string;
    desc: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      id: 'docx',
      label: 'Microsoft Word',
      ext: '.docx',
      desc: 'Formatted headings, paragraphs, quotes, and lists',
      icon: FileText,
    },
    {
      id: 'pdf',
      label: 'Printable PDF',
      ext: '.pdf',
      desc: 'Clean paginated manuscript with margins and page numbers',
      icon: Download,
    },
    {
      id: 'markdown',
      label: 'Markdown',
      ext: '.md',
      desc: 'Portable plain-text markup for web or notes',
      icon: FileCode,
    },
    {
      id: 'txt',
      label: 'Plain Text',
      ext: '.txt',
      desc: 'Unformatted prose text',
      icon: FileText,
    },
    {
      id: 'bundle',
      label: 'Folio Version Archive',
      ext: '.folio.json',
      desc: 'Full essay backup including all iterations and outline',
      icon: FileArchive,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div>
            <h2
              id="export-modal-title"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Export Essay
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Download your finished draft or archive as DOCX, PDF, Markdown, or JSON.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Controls */}
          <div className="md:col-span-7 space-y-5">
            {/* Version Selector */}
            {format !== 'bundle' && (
              <div>
                <label
                  htmlFor="export-version-select"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Iteration to Export
                </label>
                <select
                  id="export-version-select"
                  value={selectedVersion.id}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {essay.versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} · {v.label} (
                      {getTextMetrics(v.contentText).words.toLocaleString()} words)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Format Options */}
            <div>
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                File Format
              </div>
              <div className="space-y-2">
                {formatOptions.map((opt) => {
                  const Icon = opt.icon;
                  const active = format === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormat(opt.id)}
                      className={`w-full p-3 text-left rounded-xl border flex items-start gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        active
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          active
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-zinc-400'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {opt.label}
                          </span>
                          <span className="font-mono-data text-[11px] text-zinc-500 dark:text-zinc-400">
                            {opt.ext}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {opt.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Layout Style for PDF & DOCX */}
            {(format === 'docx' || format === 'pdf') && (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Document Layout
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStyle('editorial')}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                        style === 'editorial'
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      Clean Editorial
                    </button>
                    <button
                      type="button"
                      onClick={() => setStyle('academic')}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                        style === 'academic'
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      Academic Double-Spaced
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeHeader}
                    onChange={(e) => setIncludeHeader(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600"
                  />
                  <span>Include author byline and running page header</span>
                </label>
              </div>
            )}
          </div>

          {/* Right Live Paper Preview */}
          <div className="md:col-span-5 flex flex-col">
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Page Preview
            </div>
            <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between min-h-[280px]">
              <div className="bg-white text-zinc-900 border border-zinc-200 rounded-lg p-5 shadow-xs flex-1 font-serif-prose overflow-hidden">
                {includeHeader && style === 'academic' && (
                  <div className="text-[10px] text-zinc-600 mb-3 leading-snug">
                    {essay.author && <div>{essay.author}</div>}
                    <div>{formatDateLabel(selectedVersion.updatedAt)}</div>
                  </div>
                )}

                <div
                  className={`font-bold text-zinc-900 leading-tight ${
                    style === 'academic'
                      ? 'text-center text-sm'
                      : 'text-left text-base'
                  }`}
                >
                  {selectedVersion.title || 'Untitled Essay'}
                </div>

                {selectedVersion.subtitle && (
                  <div
                    className={`mt-1 italic text-[11px] text-zinc-500 ${
                      style === 'academic' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {selectedVersion.subtitle}
                  </div>
                )}

                {includeHeader && style === 'editorial' && essay.author && (
                  <div className="mt-1.5 text-[10px] text-zinc-500 font-sans-ui">
                    By {essay.author} · {formatDateLabel(selectedVersion.updatedAt)}
                  </div>
                )}

                <div
                  className={`mt-3 pt-3 border-t border-zinc-100 text-[11px] text-zinc-700 line-clamp-6 ${
                    style === 'academic' ? 'leading-loose indent-4' : 'leading-relaxed'
                  }`}
                >
                  {selectedVersion.contentText || 'No body prose written yet.'}
                </div>
              </div>

              <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums text-center">
                {metrics.words.toLocaleString()} words · {metrics.paragraphs} paragraphs
              </div>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 mb-3 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2.5 bg-zinc-50/70 dark:bg-zinc-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors"
          >
            {exportedFormat ? (
              <>
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Downloaded {exportedFormat}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {exporting ? 'Preparing...' : `Download ${format.toUpperCase()}`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
