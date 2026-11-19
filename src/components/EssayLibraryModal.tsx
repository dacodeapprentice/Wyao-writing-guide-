import React, { useMemo, useState } from 'react';
import {
  Copy,
  FileText,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { EssayDocument } from '../types/essay';
import { formatDateLabel, getTextMetrics } from '../utils/textUtils';

interface EssayLibraryModalProps {
  essays: EssayDocument[];
  activeEssayId: string;
  onClose: () => void;
  onSelectEssay: (essayId: string) => void;
  onCreateNewEssay: () => void;
  onDuplicateEssay: (essayId: string) => void;
  onDeleteEssay: (essayId: string) => void;
  onTriggerFileImport: () => void;
  onDropFiles: (files: FileList) => void;
}

export const EssayLibraryModal: React.FC<EssayLibraryModalProps> = ({
  essays,
  activeEssayId,
  onClose,
  onSelectEssay,
  onCreateNewEssay,
  onDuplicateEssay,
  onDeleteEssay,
  onTriggerFileImport,
  onDropFiles,
}) => {
  const [query, setQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...essays].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    if (!q) return sorted;
    return sorted.filter((essay) => {
      const active =
        essay.versions.find((v) => v.id === essay.activeVersionId) ??
        essay.versions[0];
      return (
        (active?.title || '').toLowerCase().includes(q) ||
        (essay.author || '').toLowerCase().includes(q) ||
        (active?.contentText || '').toLowerCase().includes(q)
      );
    });
  }, [essays, query]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="library-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-2xl max-h-[85vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2
              id="library-modal-title"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Saved Essays &amp; File Opener
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Open a saved draft from your library or import a .docx, .md, .txt, .html, or .folio.json file.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close essays library"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Search + Actions */}
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saved essays..."
              aria-label="Search saved essays"
              className="w-full h-9 pl-9 pr-3 text-sm bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTriggerFileImport}
              className="h-9 inline-flex items-center gap-1.5 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Open from Disk</span>
            </button>
            <button
              type="button"
              onClick={onCreateNewEssay}
              className="h-9 inline-flex items-center gap-1.5 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>New Essay</span>
            </button>
          </div>
        </div>

        {/* Drag-and-Drop File Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.length) {
              onDropFiles(e.dataTransfer.files);
            }
          }}
          className={`mx-6 mt-4 p-3 rounded-xl border border-dashed text-center text-xs transition-colors ${
            isDragging
              ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
              : 'border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
          }`}
        >
          Drag and drop a <span className="font-medium">.docx</span>,{' '}
          <span className="font-medium">.md</span>,{' '}
          <span className="font-medium">.txt</span>, or{' '}
          <span className="font-medium">.folio.json</span> file here to open it in Folio.
        </div>

        {/* Saved Essays List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No matching essays found.
            </div>
          ) : (
            filtered.map((essay) => {
              const activeVer =
                essay.versions.find((v) => v.id === essay.activeVersionId) ??
                essay.versions[0];
              const isCurrent = essay.id === activeEssayId;
              const metrics = getTextMetrics(activeVer?.contentText || '');

              return (
                <div
                  key={essay.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectEssay(essay.id)}
                    className="flex items-start gap-3 text-left min-w-0 flex-1 focus-visible:outline-none"
                  >
                    <FileText
                      className={`w-4 h-4 mt-1 shrink-0 ${
                        isCurrent
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-zinc-400'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {activeVer?.title || 'Untitled Essay'}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                        <span>{metrics.words.toLocaleString()} words</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {essay.versions.length}{' '}
                          {essay.versions.length === 1 ? 'version' : 'versions'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Updated {formatDateLabel(essay.updatedAt)}</span>
                        {isCurrent && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              Open
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => onSelectEssay(essay.id)}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        Open
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDuplicateEssay(essay.id)}
                      title="Duplicate essay"
                      aria-label={`Duplicate ${activeVer?.title || 'essay'}`}
                      className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>

                    {essays.length > 1 &&
                      (confirmDeleteId === essay.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteEssay(essay.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                        >
                          Confirm Delete
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(essay.id)}
                          title="Delete essay"
                          aria-label={`Delete ${activeVer?.title || 'essay'}`}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
