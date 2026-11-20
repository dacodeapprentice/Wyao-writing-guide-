/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Columns2, GitCompareArrows, ListTree, PenLine } from 'lucide-react';
import { EssayLibraryModal } from './components/EssayLibraryModal';
import { ExportModal } from './components/ExportModal';
import { NewVersionModal } from './components/NewVersionModal';
import { OutlineDrawer } from './components/OutlineDrawer';
import { RichEditor } from './components/RichEditor';
import { SplitRevisionView } from './components/SplitRevisionView';
import { TopBar } from './components/TopBar';
import { TrackChangesView } from './components/TrackChangesView';
import { WorkspaceToolbar } from './components/WorkspaceToolbar';
import type {
  EditorPreferences,
  EssayDocument,
  EssayOutlineItem,
  EssayVersion,
  WorkspaceMode,
} from './types/essay';
import { importEssayFromFile } from './utils/importers';
import {
  createBlankEssay,
  loadActiveEssayId,
  loadEssaysFromStorage,
  loadPreferences,
  saveActiveEssayId,
  saveEssaysToStorage,
  savePreferences,
} from './utils/storage';
import { getTextMetrics } from './utils/textUtils';

export default function App() {
  const [essays, setEssays] = useState<EssayDocument[]>(() =>
    loadEssaysFromStorage()
  );
  const [activeEssayId, setActiveEssayId] = useState<string>(() =>
    loadActiveEssayId(loadEssaysFromStorage())
  );
  const [prefs, setPrefs] = useState<EditorPreferences>(() => loadPreferences());
  const [mode, setMode] = useState<WorkspaceMode>('write');
  const [showOutline, setShowOutline] = useState<boolean>(false);

  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: 'neutral' | 'error';
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const notify = useCallback(
    (message: string, tone: 'neutral' | 'error' = 'neutral') => {
      setToast({ message, tone });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  // Apply light/dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', prefs.theme === 'dark');
    savePreferences(prefs);
  }, [prefs]);

  // Persist essays and active essay ID whenever they change
  useEffect(() => {
    saveEssaysToStorage(essays);
  }, [essays]);

  useEffect(() => {
    if (activeEssayId) {
      saveActiveEssayId(activeEssayId);
    }
  }, [activeEssayId]);

  const activeEssay = useMemo(
    () => essays.find((e) => e.id === activeEssayId) ?? essays[0],
    [essays, activeEssayId]
  );

  const activeVersion = useMemo(
    () =>
      activeEssay.versions.find((v) => v.id === activeEssay.activeVersionId) ??
      activeEssay.versions[activeEssay.versions.length - 1],
    [activeEssay]
  );

  const referenceVersion = useMemo(() => {
    if (
      activeEssay.referenceVersionId &&
      activeEssay.versions.some((v) => v.id === activeEssay.referenceVersionId)
    ) {
      return activeEssay.versions.find(
        (v) => v.id === activeEssay.referenceVersionId
      )!;
    }
    const prior = activeEssay.versions.find((v) => v.id !== activeVersion.id);
    return prior ?? activeVersion;
  }, [activeEssay, activeVersion]);

  const activeMetrics = useMemo(
    () => getTextMetrics(activeVersion.contentText),
    [activeVersion.contentText]
  );

  const updateActiveEssay = useCallback(
    (updater: (prev: EssayDocument) => EssayDocument) => {
      setEssays((prevEssays) =>
        prevEssays.map((essay) =>
          essay.id === activeEssay.id ? updater(essay) : essay
        )
      );
    },
    [activeEssay.id]
  );

  const updateVersionById = useCallback(
    (versionId: string, updater: (prev: EssayVersion) => EssayVersion) => {
      const now = new Date().toISOString();
      updateActiveEssay((essay) => ({
        ...essay,
        updatedAt: now,
        versions: essay.versions.map((ver) =>
          ver.id === versionId ? { ...updater(ver), updatedAt: now } : ver
        ),
      }));
    },
    [updateActiveEssay]
  );

  const updateActiveVersion = useCallback(
    (updater: (prev: EssayVersion) => EssayVersion) => {
      updateVersionById(activeVersion.id, updater);
    },
    [activeVersion.id, updateVersionById]
  );

  const handleSaveNow = useCallback(() => {
    saveEssaysToStorage(essays);
    saveActiveEssayId(activeEssay.id);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  }, [essays, activeEssay.id]);

  // Keyboard shortcuts: Cmd/Ctrl+S (Save), Cmd/Ctrl+O (Open Essays), Esc (Close modals)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveNow();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setShowLibraryModal(true);
      } else if (e.key === 'Escape') {
        setShowLibraryModal(false);
        setShowNewVersionModal(false);
        setShowExportModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSaveNow]);

  const handleNewEssay = () => {
    const fresh = createBlankEssay();
    setEssays((prev) => [fresh, ...prev]);
    setActiveEssayId(fresh.id);
    setMode('write');
    setShowLibraryModal(false);
    notify('Started a new essay');
  };

  const handleDuplicateEssay = (essayId: string) => {
    const source = essays.find((e) => e.id === essayId);
    if (!source) return;
    const now = new Date().toISOString();
    const copy: EssayDocument = {
      ...source,
      id: `essay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
      versions: source.versions.map((v, idx) => ({
        ...v,
        title:
          idx === source.versions.length - 1
            ? `${v.title || 'Untitled Essay'} (Copy)`
            : v.title,
      })),
    };
    setEssays((prev) => [copy, ...prev]);
    setActiveEssayId(copy.id);
    setShowLibraryModal(false);
    notify('Duplicated essay');
  };

  const handleDeleteEssay = (essayId: string) => {
    if (essays.length <= 1) return;
    const remaining = essays.filter((e) => e.id !== essayId);
    setEssays(remaining);
    if (activeEssayId === essayId && remaining[0]) {
      setActiveEssayId(remaining[0].id);
    }
    notify('Essay deleted');
  };

  const handleFilesImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const result = await importEssayFromFile(file);
      if (result.kind === 'bundle' && result.essay) {
        setEssays((prev) => [result.essay!, ...prev]);
        setActiveEssayId(result.essay.id);
        setShowLibraryModal(false);
        setMode('write');
        notify(`Opened "${file.name}" with ${result.essay.versions.length} versions`);
      } else if (result.kind === 'single') {
        const fresh = createBlankEssay(result.title || 'Imported Essay');
        const now = new Date().toISOString();
        fresh.versions[0] = {
          ...fresh.versions[0],
          label: 'Imported Draft',
          title: result.title || 'Imported Essay',
          contentHtml: result.contentHtml || '',
          contentText: result.contentText || '',
          creationMode: 'imported',
          notes: `Imported from ${file.name}`,
          updatedAt: now,
        };
        setEssays((prev) => [fresh, ...prev]);
        setActiveEssayId(fresh.id);
        setShowLibraryModal(false);
        setMode('write');
        notify(`Opened "${file.name}"`);
      }
    } catch (err) {
      notify(
        err instanceof Error ? err.message : `Could not open "${file.name}".`,
        'error'
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const nextVersionNumber = useMemo(
    () =>
      Math.max(0, ...activeEssay.versions.map((v) => v.versionNumber)) + 1,
    [activeEssay.versions]
  );

  const handleCreateVersion = (params: {
    baseVersionId: string;
    mode: 'scratch_alongside' | 'copy_and_edit';
    label: string;
    notes: string;
    openInSplit: boolean;
  }) => {
    const base =
      activeEssay.versions.find((v) => v.id === params.baseVersionId) ??
      activeVersion;
    const now = new Date().toISOString();
    const isScratch = params.mode === 'scratch_alongside';

    const newVer: EssayVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      versionNumber: nextVersionNumber,
      label: params.label,
      title: base.title,
      subtitle: isScratch ? '' : base.subtitle,
      contentHtml: isScratch ? '' : base.contentHtml,
      contentText: isScratch ? '' : base.contentText,
      createdAt: now,
      updatedAt: now,
      parentVersionId: base.id,
      creationMode: params.mode,
      notes:
        params.notes ||
        (isScratch
          ? `Fresh rewrite referencing v${base.versionNumber}`
          : `Copied from v${base.versionNumber} for revision`),
    };

    updateActiveEssay((essay) => ({
      ...essay,
      updatedAt: now,
      versions: [...essay.versions, newVer],
      activeVersionId: newVer.id,
      referenceVersionId: base.id,
    }));

    setShowNewVersionModal(false);
    if (params.openInSplit) {
      setMode('split');
    }
    notify(
      isScratch
        ? `Created v${newVer.versionNumber} blank draft alongside v${base.versionNumber}`
        : `Copied v${base.versionNumber} into v${newVer.versionNumber}`
    );
  };

  const handleRestoreVersionAsNew = (sourceVersion: EssayVersion) => {
    const now = new Date().toISOString();
    const newVer: EssayVersion = {
      id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      versionNumber: nextVersionNumber,
      label: `Branched from v${sourceVersion.versionNumber}`,
      title: sourceVersion.title,
      subtitle: sourceVersion.subtitle,
      contentHtml: sourceVersion.contentHtml,
      contentText: sourceVersion.contentText,
      createdAt: now,
      updatedAt: now,
      parentVersionId: sourceVersion.id,
      creationMode: 'copy_and_edit',
      notes: `Restored from v${sourceVersion.versionNumber}`,
    };

    updateActiveEssay((essay) => ({
      ...essay,
      updatedAt: now,
      versions: [...essay.versions, newVer],
      activeVersionId: newVer.id,
      referenceVersionId: activeVersion.id,
    }));
    setMode('split');
    notify(`Created v${newVer.versionNumber} from v${sourceVersion.versionNumber}`);
  };

  const handleDeleteVersion = (versionId: string) => {
    if (activeEssay.versions.length <= 1) return;
    const remaining = activeEssay.versions.filter((v) => v.id !== versionId);
    const fallbackId = remaining[remaining.length - 1].id;
    updateActiveEssay((essay) => ({
      ...essay,
      versions: remaining,
      activeVersionId:
        essay.activeVersionId === versionId ? fallbackId : essay.activeVersionId,
      referenceVersionId:
        essay.referenceVersionId === versionId
          ? remaining[0].id
          : essay.referenceVersionId,
    }));
    notify('Version removed');
  };

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 lg:overflow-hidden">
      {/* Hidden native file input for opening local .docx/.md/.txt/.html/.json */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.md,.markdown,.txt,.html,.htm,.json"
        onChange={(e) => handleFilesImport(e.target.files)}
        className="hidden"
        aria-hidden="true"
      />

      {/* Strict 3-Zone Top Bar */}
      <TopBar
        onOpenLibrary={() => setShowLibraryModal(true)}
        onNewEssay={handleNewEssay}
        onTriggerFileImport={() => fileInputRef.current?.click()}
        onOpenExport={() => setShowExportModal(true)}
        onSaveNow={handleSaveNow}
        justSaved={justSaved}
        font={prefs.font}
        theme={prefs.theme}
        onToggleFont={() =>
          setPrefs((prev) => ({
            ...prev,
            font: prev.font === 'serif' ? 'sans' : 'serif',
          }))
        }
        onToggleTheme={() =>
          setPrefs((prev) => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark',
          }))
        }
      />

      {/* Secondary Workspace Toolbar */}
      <WorkspaceToolbar
        versions={activeEssay.versions}
        activeVersion={activeVersion}
        wordCount={activeMetrics.words}
        readingMinutes={activeMetrics.readingMinutes}
        mode={mode}
        showOutline={showOutline}
        font={prefs.font}
        theme={prefs.theme}
        onSelectVersion={(verId) => {
          updateActiveEssay((essay) => ({
            ...essay,
            activeVersionId: verId,
          }));
        }}
        onOpenNewVersionModal={() => setShowNewVersionModal(true)}
        onChangeMode={setMode}
        onToggleOutline={() => setShowOutline((prev) => !prev)}
        onToggleFont={() =>
          setPrefs((prev) => ({
            ...prev,
            font: prev.font === 'serif' ? 'sans' : 'serif',
          }))
        }
        onToggleTheme={() =>
          setPrefs((prev) => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark',
          }))
        }
      />

      {/* Main Workspace Area */}
      <main className="flex-1 min-h-0 p-2.5 sm:p-5 pb-20 md:pb-6 lg:pb-5 flex gap-4 lg:overflow-hidden">
        <div className="flex-1 min-w-0 lg:h-full flex flex-col">
          {mode === 'write' && (
            <RichEditor
              version={activeVersion}
              author={activeEssay.author}
              font={prefs.font}
              onChangeAuthor={(author) =>
                updateActiveEssay((essay) => ({ ...essay, author }))
              }
              onChangeTitle={(title) =>
                updateActiveVersion((ver) => ({ ...ver, title }))
              }
              onChangeSubtitle={(subtitle) =>
                updateActiveVersion((ver) => ({ ...ver, subtitle }))
              }
              onChangeContent={(contentHtml, contentText) =>
                updateActiveVersion((ver) => ({
                  ...ver,
                  contentHtml,
                  contentText,
                }))
              }
            />
          )}

          {mode === 'split' && (
            <SplitRevisionView
              versions={activeEssay.versions}
              activeVersion={activeVersion}
              referenceVersion={referenceVersion}
              author={activeEssay.author}
              font={prefs.font}
              onSelectActiveVersion={(verId) =>
                updateActiveEssay((essay) => ({
                  ...essay,
                  activeVersionId: verId,
                }))
              }
              onSelectReferenceVersion={(refId) =>
                updateActiveEssay((essay) => ({
                  ...essay,
                  referenceVersionId: refId,
                }))
              }
              onChangeAuthor={(author) =>
                updateActiveEssay((essay) => ({ ...essay, author }))
              }
              onUpdateVersionById={updateVersionById}
              onOpenNewVersionModal={() => setShowNewVersionModal(true)}
              onGoToTrackChanges={() => setMode('track')}
            />
          )}

          {mode === 'track' && (
            <TrackChangesView
              versions={activeEssay.versions}
              activeVersion={activeVersion}
              defaultBaseVersionId={referenceVersion.id}
              font={prefs.font}
              onRevertParagraphsInActive={(newPlainText, newHtml) => {
                updateActiveVersion((ver) => ({
                  ...ver,
                  contentText: newPlainText,
                  contentHtml: newHtml,
                }));
              }}
              onRestoreVersionAsNew={handleRestoreVersionAsNew}
            />
          )}
        </div>

        {/* Optional Collapsible Outline, Goals & Version Log Drawer */}
        {showOutline && (
          <OutlineDrawer
            essay={activeEssay}
            currentWordCount={activeMetrics.words}
            onClose={() => setShowOutline(false)}
            onUpdateWordGoal={(wordGoal) =>
              updateActiveEssay((essay) => ({ ...essay, wordGoal }))
            }
            onUpdateThesis={(thesis) =>
              updateActiveEssay((essay) => ({ ...essay, thesis }))
            }
            onUpdateOutline={(outline: EssayOutlineItem[]) =>
              updateActiveEssay((essay) => ({ ...essay, outline }))
            }
            onUpdateScratchpad={(scratchpad) =>
              updateActiveEssay((essay) => ({ ...essay, scratchpad }))
            }
            onSelectVersion={(verId) => {
              updateActiveEssay((essay) => ({
                ...essay,
                activeVersionId: verId,
              }));
            }}
            onCompareVersion={(verId) => {
              updateActiveEssay((essay) => ({
                ...essay,
                referenceVersionId: verId,
              }));
              setMode('track');
            }}
            onDeleteVersion={handleDeleteVersion}
            onUpdateVersionMeta={(verId, label, notes) =>
              updateActiveEssay((essay) => ({
                ...essay,
                versions: essay.versions.map((v) =>
                  v.id === verId ? { ...v, label, notes } : v
                ),
              }))
            }
          />
        )}
      </main>

      {/* Modals */}
      {showNewVersionModal && (
        <NewVersionModal
          versions={activeEssay.versions}
          activeVersionId={activeVersion.id}
          nextVersionNumber={nextVersionNumber}
          onClose={() => setShowNewVersionModal(false)}
          onCreateVersion={handleCreateVersion}
        />
      )}

      {showLibraryModal && (
        <EssayLibraryModal
          essays={essays}
          activeEssayId={activeEssay.id}
          onClose={() => setShowLibraryModal(false)}
          onSelectEssay={(id) => {
            setActiveEssayId(id);
            setShowLibraryModal(false);
          }}
          onCreateNewEssay={handleNewEssay}
          onDuplicateEssay={handleDuplicateEssay}
          onDeleteEssay={handleDeleteEssay}
          onTriggerFileImport={() => fileInputRef.current?.click()}
          onDropFiles={(files) => handleFilesImport(files)}
        />
      )}

      {showExportModal && (
        <ExportModal
          essay={activeEssay}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Mobile Thumb-Zone Bottom Navigation Bar (stays under 15% sticky cap) */}
      <nav
        aria-label="Mobile workspace navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-4 items-center"
      >
        <button
          type="button"
          onClick={() => setMode('write')}
          className={`h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
            mode === 'write'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <PenLine className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px] font-medium">Write</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('split')}
          className={`h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
            mode === 'split'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <Columns2 className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px] font-medium">Split</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('track')}
          className={`h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
            mode === 'track'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <GitCompareArrows className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px] font-medium">Changes</span>
        </button>

        <button
          type="button"
          onClick={() => setShowOutline((prev) => !prev)}
          className={`h-full min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
            showOutline
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <ListTree className="w-5 h-5" aria-hidden="true" />
          <span className="text-[11px] font-medium">Outline</span>
        </button>
      </nav>

      {/* Subtle Transient Status Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 md:bottom-5 right-4 md:right-5 z-50 px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg border transition-opacity ${
            toast.tone === 'error'
              ? 'bg-rose-600 text-white border-rose-700'
              : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-800 dark:border-zinc-200'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
