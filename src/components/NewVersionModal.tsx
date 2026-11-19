import React, { useState } from 'react';
import { Columns2, Copy, FilePlus, X } from 'lucide-react';
import type { EssayVersion } from '../types/essay';
import { getTextMetrics } from '../utils/textUtils';

interface NewVersionModalProps {
  versions: EssayVersion[];
  activeVersionId: string;
  nextVersionNumber: number;
  onClose: () => void;
  onCreateVersion: (params: {
    baseVersionId: string;
    mode: 'scratch_alongside' | 'copy_and_edit';
    label: string;
    notes: string;
    openInSplit: boolean;
  }) => void;
}

export const NewVersionModal: React.FC<NewVersionModalProps> = ({
  versions,
  activeVersionId,
  nextVersionNumber,
  onClose,
  onCreateVersion,
}) => {
  const [baseVersionId, setBaseVersionId] = useState(activeVersionId);
  const [mode, setMode] = useState<'scratch_alongside' | 'copy_and_edit'>(
    'copy_and_edit'
  );
  const [label, setLabel] = useState(`Draft ${nextVersionNumber}`);
  const [notes, setNotes] = useState('');
  const [openInSplit, setOpenInSplit] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateVersion({
      baseVersionId,
      mode,
      label: label.trim() || `Draft ${nextVersionNumber}`,
      notes: notes.trim(),
      openInSplit,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-version-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-[2px]"
    >
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div>
            <h2
              id="new-version-title"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Create Updated Version (v{nextVersionNumber})
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Start a fresh iteration while keeping your earlier work preserved for comparison.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Base Version Picker */}
          <div>
            <label
              htmlFor="base-version-picker"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Base on Existing Iteration
            </label>
            <select
              id="base-version-picker"
              value={baseVersionId}
              onChange={(e) => setBaseVersionId(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {versions.map((v) => {
                const words = getTextMetrics(v.contentText).words;
                return (
                  <option key={v.id} value={v.id}>
                    v{v.versionNumber} · {v.label} ({words.toLocaleString()} words)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Two Creation Modes */}
          <div>
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              How would you like to write v{nextVersionNumber}?
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('scratch_alongside')}
                className={`p-4 text-left rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  mode === 'scratch_alongside'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <FilePlus
                    className={`w-4 h-4 ${
                      mode === 'scratch_alongside'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-zinc-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span>Write from Scratch</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Opens a blank sheet on Screen 2 while keeping the older version on Screen 1.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('copy_and_edit')}
                className={`p-4 text-left rounded-xl border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  mode === 'copy_and_edit'
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <Copy
                    className={`w-4 h-4 ${
                      mode === 'copy_and_edit'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-zinc-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span>Copy Old &amp; Edit</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Duplicates the old essay into an editable copy on Screen 2 alongside the original on Screen 1.
                </p>
              </button>
            </div>
          </div>

          {/* Label & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="new-version-label"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Iteration Label
              </label>
              <input
                id="new-version-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Structural Rewrite"
                className="w-full h-10 px-3 text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="new-version-notes"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Revision Goal (Optional)
              </label>
              <input
                id="new-version-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Tighten intro & add evidence"
                className="w-full h-10 px-3 text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Open in Two-Screen Split Mode Toggle */}
          <label className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={openInSplit}
              onChange={(e) => setOpenInSplit(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600"
            />
            <Columns2 className="w-4 h-4 text-zinc-500" aria-hidden="true" />
            <span>
              Open immediately in Two-Screen Split Revision workspace
            </span>
          </label>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Create Version v{nextVersionNumber}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
