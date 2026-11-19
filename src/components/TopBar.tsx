import React, { useState } from 'react';
import {
  Check,
  Download,
  FilePlus2,
  FolderOpen,
  Menu,
  Moon,
  Sun,
  Type,
  Upload,
  X,
} from 'lucide-react';
import type { EditorFont, ThemeMode } from '../types/essay';

interface TopBarProps {
  onOpenLibrary: () => void;
  onNewEssay: () => void;
  onTriggerFileImport: () => void;
  onOpenExport: () => void;
  onSaveNow: () => void;
  justSaved: boolean;
  font: EditorFont;
  theme: ThemeMode;
  onToggleFont: () => void;
  onToggleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenLibrary,
  onNewEssay,
  onTriggerFileImport,
  onOpenExport,
  onSaveNow,
  justSaved,
  font,
  theme,
  onToggleFont,
  onToggleTheme,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const runAndClose = (fn: () => void) => {
    setMobileMenuOpen(false);
    fn();
  };

  return (
    <>
      <header className="h-[52px] md:h-14 px-3 sm:px-6 flex items-center justify-between gap-4 md:gap-8 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0 sticky top-0 z-30 md:static">
        {/* Zone 1: Single-element Brand wordmark */}
        <a
          href="#top"
          onClick={(e) => e.preventDefault()}
          className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          Folio
        </a>

        {/* Zone 2: Clean single-line text navigation links (Desktop) */}
        <nav
          aria-label="Document actions"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400"
        >
          <button
            type="button"
            onClick={onOpenLibrary}
            className="inline-flex items-center gap-1.5 py-1 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
          >
            <FolderOpen className="w-4 h-4 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
            <span>Essays</span>
          </button>

          <button
            type="button"
            onClick={onNewEssay}
            className="inline-flex items-center gap-1.5 py-1 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
          >
            <FilePlus2 className="w-4 h-4 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
            <span>New Essay</span>
          </button>

          <button
            type="button"
            onClick={onTriggerFileImport}
            className="inline-flex items-center gap-1.5 py-1 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
          >
            <Upload className="w-4 h-4 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
            <span>Open File</span>
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            className="inline-flex items-center gap-1.5 py-1 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
          >
            <Download className="w-4 h-4 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
            <span>Export</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action (+ compact mobile menu trigger on phone) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open document menu"
            className="md:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onSaveNow}
            className="min-h-[40px] md:min-h-0 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
          >
            {justSaved && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
            <span>{justSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Document Action Sheet */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Document actions menu"
          className="fixed inset-0 z-50 md:hidden bg-zinc-950/50 backdrop-blur-[2px] flex items-end"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-full bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 rounded-t-2xl p-4 pb-6 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between px-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Document Actions
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-zinc-500 rounded-lg"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => runAndClose(onOpenLibrary)}
              className="w-full min-h-[48px] px-3 flex items-center gap-3 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-zinc-500" aria-hidden="true" />
              <span>Saved Essays</span>
            </button>

            <button
              type="button"
              onClick={() => runAndClose(onNewEssay)}
              className="w-full min-h-[48px] px-3 flex items-center gap-3 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <FilePlus2 className="w-4 h-4 text-zinc-500" aria-hidden="true" />
              <span>New Essay</span>
            </button>

            <button
              type="button"
              onClick={() => runAndClose(onTriggerFileImport)}
              className="w-full min-h-[48px] px-3 flex items-center gap-3 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <Upload className="w-4 h-4 text-zinc-500" aria-hidden="true" />
              <span>Open File (.docx, .md, .txt)</span>
            </button>

            <button
              type="button"
              onClick={() => runAndClose(onOpenExport)}
              className="w-full min-h-[48px] px-3 flex items-center gap-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Export to PDF or DOCX</span>
            </button>

            <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onToggleFont}
                className="min-h-[44px] px-3 flex items-center justify-center gap-2 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl"
              >
                <Type className="w-4 h-4" aria-hidden="true" />
                <span>{font === 'serif' ? 'Serif Prose' : 'Sans Prose'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleTheme}
                className="min-h-[44px] px-3 flex items-center justify-center gap-2 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4" aria-hidden="true" />
                    <span>Light Paper</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4" aria-hidden="true" />
                    <span>Dark Ink</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
