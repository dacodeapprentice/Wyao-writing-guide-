import React, { useState } from 'react';
import {
  CheckSquare,
  GitBranch,
  Plus,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import type { EssayDocument, EssayOutlineItem } from '../types/essay';
import { formatDateLabel, getTextMetrics } from '../utils/textUtils';

interface OutlineDrawerProps {
  essay: EssayDocument;
  currentWordCount: number;
  onClose: () => void;
  onUpdateWordGoal: (goal: number) => void;
  onUpdateThesis: (thesis: string) => void;
  onUpdateOutline: (outline: EssayOutlineItem[]) => void;
  onUpdateScratchpad: (scratchpad: string) => void;
  onSelectVersion: (versionId: string) => void;
  onCompareVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
  onUpdateVersionMeta: (versionId: string, label: string, notes: string) => void;
}

export const OutlineDrawer: React.FC<OutlineDrawerProps> = ({
  essay,
  currentWordCount,
  onClose,
  onUpdateWordGoal,
  onUpdateThesis,
  onUpdateOutline,
  onUpdateScratchpad,
  onSelectVersion,
  onCompareVersion,
  onDeleteVersion,
  onUpdateVersionMeta,
}) => {
  const [activeTab, setActiveTab] = useState<'plan' | 'versions'>('plan');
  const [newSectionTitle, setNewSectionTitle] = useState('');

  const progressPct =
    essay.wordGoal > 0
      ? Math.min(100, Math.round((currentWordCount / essay.wordGoal) * 100))
      : 0;

  const handleAddOutlineItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) return;
    const item: EssayOutlineItem = {
      id: `out-${Date.now()}`,
      heading: newSectionTitle.trim(),
      summary: '',
      completed: false,
    };
    onUpdateOutline([...essay.outline, item]);
    setNewSectionTitle('');
  };

  const toggleItem = (id: string) => {
    onUpdateOutline(
      essay.outline.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const updateItemSummary = (id: string, summary: string) => {
    onUpdateOutline(
      essay.outline.map((item) =>
        item.id === id ? { ...item, summary } : item
      )
    );
  };

  const removeItem = (id: string) => {
    onUpdateOutline(essay.outline.filter((item) => item.id !== id));
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-[2px] flex items-end lg:static lg:inset-auto lg:z-auto lg:bg-transparent lg:backdrop-blur-none lg:block shrink-0"
      onClick={onClose}
    >
      <aside
        aria-label="Essay outline and version history"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[85vh] lg:max-h-none lg:w-80 xl:w-96 bg-white dark:bg-zinc-900 border-t lg:border border-zinc-200 dark:border-zinc-800 rounded-t-2xl lg:rounded-xl flex flex-col h-full shrink-0 overflow-hidden"
      >
        <div className="lg:hidden w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-2.5 shrink-0" />
        {/* Drawer Header */}
        <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className={`min-h-[36px] lg:min-h-0 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'plan'
                  ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Outline &amp; Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('versions')}
              className={`min-h-[36px] lg:min-h-0 px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'versions'
                  ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Versions ({essay.versions.length})
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close side panel"
            className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:h-8 lg:w-8 inline-flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'plan' ? (
          <>
            {/* Word Count Goal */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label
                  htmlFor="word-goal-input"
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Word Count Goal
                </label>
                <div className="flex items-center gap-1.5 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  <span>{currentWordCount.toLocaleString()}</span>
                  <span>/</span>
                  <input
                    id="word-goal-input"
                    type="number"
                    min={50}
                    max={50000}
                    step={50}
                    value={essay.wordGoal}
                    onChange={(e) =>
                      onUpdateWordGoal(Math.max(50, Number(e.target.value) || 0))
                    }
                    className="w-16 px-1.5 py-0.5 text-right text-xs font-medium bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-200"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {progressPct}% of target reached
              </div>
            </div>

            <hr className="border-zinc-200 dark:border-zinc-800" />

            {/* Thesis Statement */}
            <div>
              <label
                htmlFor="thesis-textarea"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Working Thesis
              </label>
              <textarea
                id="thesis-textarea"
                rows={3}
                value={essay.thesis}
                onChange={(e) => onUpdateThesis(e.target.value)}
                placeholder="State the central argument of your essay in one or two sentences..."
                className="w-full p-2.5 text-xs leading-relaxed bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
              />
            </div>

            <hr className="border-zinc-200 dark:border-zinc-800" />

            {/* Outline Sections */}
            <div>
              <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2.5">
                Essay Structure
              </div>
              <div className="space-y-3">
                {essay.outline.map((item) => (
                  <div
                    key={item.id}
                    className="pb-3 border-b border-zinc-100 dark:border-zinc-800/80 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className="flex items-start gap-2 text-left group"
                      >
                        {item.completed ? (
                          <CheckSquare
                            className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0"
                            aria-hidden="true"
                          />
                        ) : (
                          <Square
                            className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 mt-0.5 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <span
                          className={`text-xs font-medium leading-snug ${
                            item.completed
                              ? 'line-through text-zinc-400 dark:text-zinc-500'
                              : 'text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {item.heading}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.heading}`}
                        className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.summary}
                      onChange={(e) => updateItemSummary(item.id, e.target.value)}
                      placeholder="Key point or evidence..."
                      className="mt-1.5 ml-6 w-[calc(100%-1.5rem)] text-xs bg-transparent text-zinc-500 dark:text-zinc-400 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:text-zinc-800 dark:focus:text-zinc-200"
                    />
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddOutlineItem} className="mt-3 flex gap-1.5">
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Add outline section..."
                  className="flex-1 h-8 px-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  aria-label="Add outline section"
                  className="h-8 w-8 inline-flex items-center justify-center bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </form>
            </div>

            <hr className="border-zinc-200 dark:border-zinc-800" />

            {/* Research & Citations Scratchpad */}
            <div>
              <label
                htmlFor="scratchpad-textarea"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Sources &amp; Scratchpad
              </label>
              <textarea
                id="scratchpad-textarea"
                rows={5}
                value={essay.scratchpad}
                onChange={(e) => onUpdateScratchpad(e.target.value)}
                placeholder="Keep quotes, page citations, or stray ideas here without cluttering your manuscript..."
                className="w-full p-2.5 text-xs leading-relaxed bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-y"
              />
            </div>
          </>
        ) : (
          /* Version History List */
          <div className="space-y-4">
            {[...essay.versions]
              .sort((a, b) => b.versionNumber - a.versionNumber)
              .map((ver) => {
                const isActive = ver.id === essay.activeVersionId;
                const metrics = getTextMetrics(ver.contentText);
                const modeText =
                  ver.creationMode === 'scratch_alongside'
                    ? 'From scratch'
                    : ver.creationMode === 'copy_and_edit'
                    ? 'Copied & edited'
                    : ver.creationMode === 'imported'
                    ? 'Imported'
                    : 'Original';

                return (
                  <div
                    key={ver.id}
                    className={`p-3.5 rounded-xl border transition-colors ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/20'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                          <GitBranch className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            v{ver.versionNumber}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{modeText}</span>
                          {isActive && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                Active
                              </span>
                            </>
                          )}
                        </div>
                        <input
                          type="text"
                          value={ver.label}
                          onChange={(e) =>
                            onUpdateVersionMeta(ver.id, e.target.value, ver.notes)
                          }
                          aria-label={`Label for version ${ver.versionNumber}`}
                          className="mt-1 w-full text-sm font-semibold bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:underline"
                        />
                      </div>

                      {essay.versions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteVersion(ver.id)}
                          aria-label={`Delete version ${ver.versionNumber}`}
                          className="p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {metrics.words.toLocaleString()} words · {formatDateLabel(ver.updatedAt)}
                    </div>

                    <input
                      type="text"
                      value={ver.notes}
                      onChange={(e) =>
                        onUpdateVersionMeta(ver.id, ver.label, e.target.value)
                      }
                      placeholder="Add revision note..."
                      aria-label={`Notes for version ${ver.versionNumber}`}
                      className="mt-2 w-full text-xs bg-transparent text-zinc-600 dark:text-zinc-400 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none"
                    />

                    <div className="mt-3 flex items-center gap-2">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => onSelectVersion(ver.id)}
                          className="px-2.5 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                        >
                          Open Draft
                        </button>
                      )}
                      {essay.versions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onCompareVersion(ver.id)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
                        >
                          Compare
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      </aside>
    </div>
  );
};
