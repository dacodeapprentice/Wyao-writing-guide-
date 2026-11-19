import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Columns2,
  FileDiff,
  GitCompareArrows,
  ListChecks,
  RotateCcw,
} from 'lucide-react';
import type { EditorFont, EssayVersion } from '../types/essay';
import {
  computeParagraphDiff,
  computeWordDiff,
  type ParagraphDiffRow,
} from '../utils/diffEngine';
import { formatDateLabel, plainTextToHtml } from '../utils/textUtils';

interface TrackChangesViewProps {
  versions: EssayVersion[];
  activeVersion: EssayVersion;
  defaultBaseVersionId: string;
  font: EditorFont;
  onRevertParagraphsInActive: (newPlainText: string, newHtml: string) => void;
  onRestoreVersionAsNew: (sourceVersion: EssayVersion) => void;
}

type DiffViewStyle = 'redline' | 'side-by-side' | 'ledger';
type ChangeFilter = 'all' | 'insertions' | 'deletions';

export const TrackChangesView: React.FC<TrackChangesViewProps> = ({
  versions,
  activeVersion,
  defaultBaseVersionId,
  font,
  onRevertParagraphsInActive,
  onRestoreVersionAsNew,
}) => {
  const [baseId, setBaseId] = useState<string>(() => {
    if (
      defaultBaseVersionId &&
      versions.some((v) => v.id === defaultBaseVersionId) &&
      defaultBaseVersionId !== activeVersion.id
    ) {
      return defaultBaseVersionId;
    }
    return versions[0]?.id ?? activeVersion.id;
  });

  const [targetId, setTargetId] = useState<string>(activeVersion.id);
  const [viewStyle, setViewStyle] = useState<DiffViewStyle>('redline');
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>('all');
  const [revertedRowId, setRevertedRowId] = useState<string | null>(null);

  const baseVersion =
    versions.find((v) => v.id === baseId) ?? versions[0] ?? activeVersion;
  const targetVersion =
    versions.find((v) => v.id === targetId) ?? activeVersion;

  const wordDiff = useMemo(
    () => computeWordDiff(baseVersion.contentText, targetVersion.contentText),
    [baseVersion.contentText, targetVersion.contentText]
  );

  const paragraphRows = useMemo(
    () =>
      computeParagraphDiff(baseVersion.contentText, targetVersion.contentText),
    [baseVersion.contentText, targetVersion.contentText]
  );

  const changedParagraphCount = useMemo(
    () => paragraphRows.filter((r) => r.status !== 'unchanged').length,
    [paragraphRows]
  );

  const handleSwap = () => {
    setBaseId(targetVersion.id);
    setTargetId(baseVersion.id);
  };

  const canRevertIntoActive =
    targetVersion.id === activeVersion.id && baseVersion.id !== targetVersion.id;

  const handleRevertRow = (row: ParagraphDiffRow) => {
    if (!canRevertIntoActive) return;

    const rebuiltParagraphs: string[] = [];
    for (const r of paragraphRows) {
      if (r.id === row.id) {
        if (r.oldParagraph.trim()) {
          rebuiltParagraphs.push(r.oldParagraph.trim());
        }
      } else {
        if (r.newParagraph.trim()) {
          rebuiltParagraphs.push(r.newParagraph.trim());
        }
      }
    }

    const updatedText = rebuiltParagraphs.join('\n\n');
    const updatedHtml = plainTextToHtml(updatedText);
    onRevertParagraphsInActive(updatedText, updatedHtml);
    setRevertedRowId(row.id);
    setTimeout(() => setRevertedRowId(null), 1600);
  };

  const titleChanged = baseVersion.title.trim() !== targetVersion.title.trim();

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Top Comparison Controls */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 sm:px-5 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="diff-base-select"
              className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              Base
            </label>
            <select
              id="diff-base-select"
              value={baseVersion.id}
              onChange={(e) => setBaseId(e.target.value)}
              className="h-9 pl-2.5 pr-7 text-xs font-medium bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 max-w-[190px] truncate"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} · {v.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSwap}
            title="Swap base and target versions"
            aria-label="Swap base and target versions"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-1.5">
            <label
              htmlFor="diff-target-select"
              className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
            >
              Compared
            </label>
            <select
              id="diff-target-select"
              value={targetVersion.id}
              onChange={(e) => setTargetId(e.target.value)}
              className="h-9 pl-2.5 pr-7 text-xs font-medium bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 max-w-[190px] truncate"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber} · {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Style Switcher */}
        <div className="flex items-center gap-2 flex-wrap max-w-full">
          <div
            role="tablist"
            aria-label="Diff view mode"
            className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg max-w-full overflow-x-auto no-scrollbar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewStyle === 'redline'}
              onClick={() => setViewStyle('redline')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                viewStyle === 'redline'
                  ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <FileDiff className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Inline Redline</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewStyle === 'side-by-side'}
              onClick={() => setViewStyle('side-by-side')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                viewStyle === 'side-by-side'
                  ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Side-by-Side</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewStyle === 'ledger'}
              onClick={() => setViewStyle('ledger')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                viewStyle === 'ledger'
                  ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Change Ledger</span>
            </button>
          </div>

          {baseVersion.id !== targetVersion.id && (
            <button
              type="button"
              onClick={() => onRestoreVersionAsNew(baseVersion)}
              className="h-9 inline-flex items-center gap-1.5 px-3 text-xs font-medium bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Branch v{baseVersion.versionNumber} as New Draft</span>
            </button>
          )}
        </div>
      </div>

      {/* Unboxed Diff Summary Strip */}
      <div className="px-2 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400 tabular-nums shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-emerald-700 dark:text-emerald-400">
            +{wordDiff.addedWords} words added
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-medium text-rose-700 dark:text-rose-400">
            −{wordDiff.removedWords} words removed
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Net {wordDiff.netDelta >= 0 ? `+${wordDiff.netDelta}` : wordDiff.netDelta} words
          </span>
          <span aria-hidden="true">·</span>
          <span>{wordDiff.similarityPercent}% text retained</span>
          <span aria-hidden="true">·</span>
          <span>{changedParagraphCount} sections changed</span>
        </div>

        {viewStyle === 'redline' && (
          <div className="flex items-center gap-1 bg-zinc-200/60 dark:bg-zinc-800 p-0.5 rounded-lg">
            {(
              [
                { key: 'all', label: 'All Changes' },
                { key: 'insertions', label: 'Insertions Only' },
                { key: 'deletions', label: 'Deletions Only' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setChangeFilter(opt.key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  changeFilter === opt.key
                    ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Comparison Viewport */}
      <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-y-auto">
        {versions.length < 2 && baseVersion.id === targetVersion.id ? (
          <div className="h-full flex flex-col items-center justify-center p-10 text-center max-w-md mx-auto">
            <GitCompareArrows
              className="w-8 h-8 text-zinc-400 dark:text-zinc-600 mb-3"
              aria-hidden="true"
            />
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Only one iteration exists so far
            </h3>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              Create a new version from the toolbar to write a fresh draft alongside this one or copy and revise it—every change will be tracked here automatically.
            </p>
          </div>
        ) : baseVersion.id === targetVersion.id ? (
          <div className="h-full flex flex-col items-center justify-center p-10 text-center max-w-md mx-auto">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              You are comparing v{baseVersion.versionNumber} with itself. Choose two different iterations above to inspect tracked changes.
            </p>
          </div>
        ) : viewStyle === 'redline' ? (
          <div className="max-w-[74ch] mx-auto px-6 py-8 sm:px-12 sm:py-10">
            <div className="mb-6 pb-5 border-b border-zinc-200 dark:border-zinc-800">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                Comparing v{baseVersion.versionNumber} ({formatDateLabel(baseVersion.updatedAt)}) to v
                {targetVersion.versionNumber} ({formatDateLabel(targetVersion.updatedAt)})
              </div>

              {titleChanged ? (
                <h2
                  className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                    font === 'serif' ? 'font-serif-prose' : 'font-sans-ui'
                  }`}
                >
                  <del className="text-rose-700 dark:text-rose-400 line-through mr-2 font-normal">
                    {baseVersion.title}
                  </del>
                  <ins className="text-emerald-700 dark:text-emerald-400 underline decoration-emerald-500">
                    {targetVersion.title}
                  </ins>
                </h2>
              ) : (
                <h2
                  className={`text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 ${
                    font === 'serif' ? 'font-serif-prose' : 'font-sans-ui'
                  }`}
                >
                  {targetVersion.title || 'Untitled Essay'}
                </h2>
              )}
            </div>

            <div
              className={`essay-prose whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 ${
                font === 'serif' ? 'font-serif-prose' : 'font-sans-ui'
              }`}
            >
              {wordDiff.parts.map((part, idx) => {
                if (part.added) {
                  if (changeFilter === 'deletions') return null;
                  return (
                    <ins
                      key={idx}
                      className="bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 underline decoration-emerald-500 decoration-2 underline-offset-2 px-0.5 rounded-xs"
                    >
                      {part.value}
                    </ins>
                  );
                }
                if (part.removed) {
                  if (changeFilter === 'insertions') return null;
                  return (
                    <del
                      key={idx}
                      className="bg-rose-100/80 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 line-through decoration-rose-500 px-0.5 rounded-xs"
                    >
                      {part.value}
                    </del>
                  );
                }
                return <span key={idx}>{part.value}</span>;
              })}
            </div>
          </div>
        ) : viewStyle === 'side-by-side' ? (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            <div className="grid grid-cols-1 md:grid-cols-2 bg-zinc-50 dark:bg-zinc-950/60 text-xs font-semibold text-zinc-600 dark:text-zinc-400 sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800">
              <div className="px-6 py-3 md:border-r border-zinc-200 dark:border-zinc-800">
                Base · v{baseVersion.versionNumber} ({baseVersion.label})
              </div>
              <div className="px-6 py-3">
                Compared · v{targetVersion.versionNumber} ({targetVersion.label})
              </div>
            </div>

            {paragraphRows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800"
              >
                {/* Left: Base paragraph */}
                <div
                  className={`px-6 py-5 text-sm sm:text-base leading-relaxed ${
                    font === 'serif' ? 'font-serif-prose' : 'font-sans-ui'
                  } ${
                    row.status === 'removed'
                      ? 'bg-rose-50/60 dark:bg-rose-950/20'
                      : row.status === 'modified'
                      ? 'bg-zinc-50/40 dark:bg-zinc-950/20'
                      : ''
                  }`}
                >
                  {row.status === 'added' ? (
                    <span className="text-xs font-sans-ui text-zinc-400 dark:text-zinc-600 italic">
                      Not present in v{baseVersion.versionNumber}
                    </span>
                  ) : row.status === 'unchanged' ? (
                    <p className="text-zinc-700 dark:text-zinc-300">
                      {row.oldParagraph}
                    </p>
                  ) : (
                    <p className="text-zinc-800 dark:text-zinc-200">
                      {row.wordParts
                        .filter((p) => !p.added)
                        .map((part, idx) =>
                          part.removed ? (
                            <del
                              key={idx}
                              className="bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 line-through px-0.5 rounded-xs"
                            >
                              {part.value}
                            </del>
                          ) : (
                            <span key={idx}>{part.value}</span>
                          )
                        )}
                    </p>
                  )}
                </div>

                {/* Right: Target paragraph */}
                <div
                  className={`px-6 py-5 text-sm sm:text-base leading-relaxed ${
                    font === 'serif' ? 'font-serif-prose' : 'font-sans-ui'
                  } ${
                    row.status === 'added'
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20'
                      : row.status === 'modified'
                      ? 'bg-zinc-50/40 dark:bg-zinc-950/20'
                      : ''
                  }`}
                >
                  {row.status === 'removed' ? (
                    <span className="text-xs font-sans-ui text-zinc-400 dark:text-zinc-600 italic">
                      Removed in v{targetVersion.versionNumber}
                    </span>
                  ) : row.status === 'unchanged' ? (
                    <p className="text-zinc-700 dark:text-zinc-300">
                      {row.newParagraph}
                    </p>
                  ) : (
                    <p className="text-zinc-800 dark:text-zinc-200">
                      {row.wordParts
                        .filter((p) => !p.removed)
                        .map((part, idx) =>
                          part.added ? (
                            <ins
                              key={idx}
                              className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 underline decoration-emerald-500 px-0.5 rounded-xs"
                            >
                              {part.value}
                            </ins>
                          ) : (
                            <span key={idx}>{part.value}</span>
                          )
                        )}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Paragraph Change Ledger with Selective Revert */
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {paragraphRows.filter((r) => r.status !== 'unchanged').length === 0 ? (
              <div className="p-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No textual differences detected between v{baseVersion.versionNumber} and v
                {targetVersion.versionNumber}.
              </div>
            ) : (
              paragraphRows
                .filter((r) => r.status !== 'unchanged')
                .map((row, idx) => (
                  <div
                    key={row.id}
                    className="p-5 sm:px-8 flex flex-col gap-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs tabular-nums">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          Change {idx + 1}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-medium capitalize ${
                            row.status === 'added'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : row.status === 'removed'
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-blue-700 dark:text-blue-400'
                          }`}
                        >
                          {row.status}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-700 dark:text-emerald-400">
                          +{row.addedWords}
                        </span>
                        <span className="text-rose-700 dark:text-rose-400">
                          −{row.removedWords}
                        </span>
                      </div>

                      {canRevertIntoActive && (
                        <button
                          type="button"
                          onClick={() => handleRevertRow(row)}
                          className="h-8 inline-flex items-center gap-1.5 px-3 text-xs font-medium bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                        >
                          {revertedRowId === row.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                              <span>Reverted</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Revert Section to v{baseVersion.versionNumber}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div
                      className={`text-sm sm:text-base leading-relaxed text-zinc-800 dark:text-zinc-200 ${
                        font === 'serif' ? 'font-serif-prose' : 'font-sans-ui'
                      }`}
                    >
                      {row.wordParts.map((part, pIdx) => {
                        if (part.added) {
                          return (
                            <ins
                              key={pIdx}
                              className="bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 underline decoration-emerald-500 px-0.5 rounded-xs"
                            >
                              {part.value}
                            </ins>
                          );
                        }
                        if (part.removed) {
                          return (
                            <del
                              key={pIdx}
                              className="bg-rose-100/80 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 line-through px-0.5 rounded-xs"
                            >
                              {part.value}
                            </del>
                          );
                        }
                        return <span key={pIdx}>{part.value}</span>;
                      })}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
