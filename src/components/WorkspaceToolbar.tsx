import React from 'react';
import {
  Columns2,
  GitCompareArrows,
  ListTree,
  Moon,
  PenLine,
  Plus,
  Sun,
  Type,
} from 'lucide-react';
import type {
  EditorFont,
  EssayVersion,
  ThemeMode,
  WorkspaceMode,
} from '../types/essay';
import { formatShortTime } from '../utils/textUtils';

interface WorkspaceToolbarProps {
  versions: EssayVersion[];
  activeVersion: EssayVersion;
  wordCount: number;
  readingMinutes: number;
  mode: WorkspaceMode;
  showOutline: boolean;
  font: EditorFont;
  theme: ThemeMode;
  onSelectVersion: (versionId: string) => void;
  onOpenNewVersionModal: () => void;
  onChangeMode: (mode: WorkspaceMode) => void;
  onToggleOutline: () => void;
  onToggleFont: () => void;
  onToggleTheme: () => void;
}

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({
  versions,
  activeVersion,
  wordCount,
  readingMinutes,
  mode,
  showOutline,
  font,
  theme,
  onSelectVersion,
  onOpenNewVersionModal,
  onChangeMode,
  onToggleOutline,
  onToggleFont,
  onToggleTheme,
}) => {
  return (
    <div className="px-3 sm:px-6 py-2 md:py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/70 flex flex-wrap items-center justify-between gap-2 md:gap-3 shrink-0">
      {/* Left: Version selector + New Version CTA + clean unboxed metadata */}
      <div className="flex items-center justify-between md:justify-start gap-2.5 w-full md:w-auto min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-initial">
          <label htmlFor="active-version-select" className="sr-only">
            Active Version
          </label>
          <select
            id="active-version-select"
            value={activeVersion.id}
            onChange={(e) => onSelectVersion(e.target.value)}
            className="h-10 md:h-9 pl-2.5 pr-7 text-xs font-medium bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 flex-1 md:flex-initial md:max-w-[200px] truncate"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.versionNumber} · {v.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onOpenNewVersionModal}
            className="h-10 md:h-9 inline-flex items-center gap-1.5 px-3 text-xs font-medium text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>New Version</span>
          </button>
        </div>

        <div className="hidden xl:flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
          <span>{wordCount.toLocaleString()} words</span>
          <span aria-hidden="true">·</span>
          <span>{readingMinutes} min read</span>
          <span aria-hidden="true">·</span>
          <span>Saved {formatShortTime(activeVersion.updatedAt)}</span>
        </div>
      </div>

      {/* Center: Segmented Workspace Mode Switcher (Desktop; Mobile uses fixed bottom thumb-zone tabs) */}
      <div
        role="tablist"
        aria-label="Workspace view mode"
        className="hidden md:flex items-center gap-1 p-1 bg-zinc-200/70 dark:bg-zinc-800/90 rounded-lg"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'write'}
          onClick={() => onChangeMode('write')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            mode === 'write'
              ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Write</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === 'split'}
          onClick={() => onChangeMode('split')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            mode === 'split'
              ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Columns2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Split Revision</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === 'track'}
          onClick={() => onChangeMode('track')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            mode === 'track'
              ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <GitCompareArrows className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Track Changes</span>
        </button>
      </div>

      {/* Right: Outline drawer, Typography toggle, Theme toggle (Desktop) */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleOutline}
          aria-pressed={showOutline}
          className={`h-9 inline-flex items-center gap-1.5 px-3 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            showOutline
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
              : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <ListTree className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Outline &amp; Versions</span>
        </button>

        <button
          type="button"
          onClick={onToggleFont}
          title={font === 'serif' ? 'Switch to sans-serif prose' : 'Switch to editorial serif prose'}
          className="h-9 inline-flex items-center gap-1.5 px-2.5 text-xs font-medium bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Type className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden lg:inline">{font === 'serif' ? 'Serif' : 'Sans'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light paper theme' : 'Switch to dark ink theme'}
          className="h-9 w-9 inline-flex items-center justify-center bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
};
