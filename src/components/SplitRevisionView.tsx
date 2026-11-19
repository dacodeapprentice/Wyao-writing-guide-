import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Copy,
  GitCompareArrows,
  Highlighter,
  Plus,
} from 'lucide-react';
import type { EditorFont, EssayVersion } from '../types/essay';
import { computeWordDiff } from '../utils/diffEngine';
import { RichEditor } from './RichEditor';

interface SplitRevisionViewProps {
  versions: EssayVersion[];
  activeVersion: EssayVersion;
  referenceVersion: EssayVersion;
  author: string;
  font: EditorFont;
  onSelectActiveVersion: (versionId: string) => void;
  onSelectReferenceVersion: (versionId: string) => void;
  onChangeAuthor: (author: string) => void;
  onUpdateVersionById: (
    versionId: string,
    updater: (prev: EssayVersion) => EssayVersion
  ) => void;
  onOpenNewVersionModal: () => void;
  onGoToTrackChanges: () => void;
}

type MobileSplitFocus = 'stacked' | 'screen1' | 'screen2';

export const SplitRevisionView: React.FC<SplitRevisionViewProps> = ({
  versions,
  activeVersion,
  referenceVersion,
  author,
  font,
  onSelectActiveVersion,
  onSelectReferenceVersion,
  onChangeAuthor,
  onUpdateVersionById,
  onOpenNewVersionModal,
  onGoToTrackChanges,
}) => {
  const [screen1Locked, setScreen1Locked] = useState(false);
  const [screen2Locked, setScreen2Locked] = useState(false);
  const [showLiveDiff, setShowLiveDiff] = useState(false);
  const [mobileFocus, setMobileFocus] = useState<MobileSplitFocus>('stacked');

  const liveDiff = useMemo(() => {
    if (!showLiveDiff) return null;
    return computeWordDiff(
      referenceVersion.contentText,
      activeVersion.contentText
    );
  }, [showLiveDiff, referenceVersion.contentText, activeVersion.contentText]);

  const handleCopyScreen1ToScreen2 = () => {
    if (activeVersion.id === referenceVersion.id) return;
    const mergedHtml = activeVersion.contentHtml.trim()
      ? `${activeVersion.contentHtml}${referenceVersion.contentHtml}`
      : referenceVersion.contentHtml;
    const mergedText = activeVersion.contentText.trim()
      ? `${activeVersion.contentText}\n\n${referenceVersion.contentText}`
      : referenceVersion.contentText;
    onUpdateVersionById(activeVersion.id, (ver) => ({
      ...ver,
      contentHtml: mergedHtml,
      contentText: mergedText,
    }));
  };

  const creationModeLabel =
    activeVersion.creationMode === 'scratch_alongside'
      ? 'Screen 2 started from scratch alongside Screen 1'
      : activeVersion.creationMode === 'copy_and_edit'
      ? 'Screen 2 copied from earlier iteration'
      : 'Side-by-side editing enabled on both screens';

  const liveDiffOverlay =
    showLiveDiff && liveDiff ? (
      <div
        className={`essay-prose whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 leading-[1.72] ${
          font === 'serif' ? 'font-serif-prose' : 'font-sans-ui'
        }`}
      >
        {liveDiff.parts.map((part, idx) => {
          if (part.added) {
            return (
              <ins
                key={idx}
                className="bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 underline decoration-emerald-500 underline-offset-2 px-0.5 rounded-xs"
              >
                {part.value}
              </ins>
            );
          }
          if (part.removed) {
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
    ) : undefined;

  const showScreen1 = mobileFocus === 'stacked' || mobileFocus === 'screen1';
  const showScreen2 = mobileFocus === 'stacked' || mobileFocus === 'screen2';

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Contextual Two-Screen Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-1">
        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            Split Revision
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span className="hidden sm:inline">{creationModeLabel}</span>
          {referenceVersion.id === activeVersion.id && (
            <>
              <span aria-hidden="true" className="hidden md:inline">
                ·
              </span>
              <span className="hidden md:inline text-zinc-500 dark:text-zinc-400">
                Same version open in both screens
              </span>
            </>
          )}
        </div>

        {/* Mobile Screen Switcher (Phone/Tablet < lg) */}
        <div
          role="group"
          aria-label="Mobile screen view"
          className="flex lg:hidden items-center gap-1 p-1 bg-zinc-200/80 dark:bg-zinc-800 rounded-lg"
        >
          {(
            [
              { id: 'stacked', label: 'Both' },
              { id: 'screen1', label: 'Screen 1' },
              { id: 'screen2', label: 'Screen 2' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMobileFocus(item.id)}
              className={`min-h-[36px] px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mobileFocus === item.id
                  ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNewVersionModal}
            className="h-8 inline-flex items-center gap-1.5 px-3 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Plus
              className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400"
              aria-hidden="true"
            />
            <span>New Version</span>
          </button>

          <button
            type="button"
            onClick={onGoToTrackChanges}
            className="h-8 inline-flex items-center gap-1.5 px-3 text-xs font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <GitCompareArrows className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Compare Changes</span>
          </button>
        </div>
      </div>

      {/* Two-Screen Side-by-Side Editable Workspace */}
      <div
        className={`flex-1 min-h-0 grid grid-cols-1 ${
          mobileFocus === 'stacked' ? 'lg:grid-cols-2' : 'lg:grid-cols-2'
        } gap-4 items-stretch`}
      >
        {/* SCREEN 1 */}
        <section
          aria-label="Screen 1 essay editor"
          className={`${
            showScreen1 ? 'flex' : 'hidden lg:flex'
          } flex-col min-h-[380px] lg:h-full`}
        >
          <RichEditor
            version={referenceVersion}
            author={author}
            font={font}
            compact
            screenLabel="Screen 1"
            versions={versions}
            onSelectVersion={onSelectReferenceVersion}
            readOnly={screen1Locked}
            onToggleReadOnly={() => setScreen1Locked((prev) => !prev)}
            customBodyOverlay={liveDiffOverlay}
            extraHeaderActions={
              <>
                <button
                  type="button"
                  onClick={() => setShowLiveDiff((prev) => !prev)}
                  aria-pressed={showLiveDiff}
                  title="Overlay live differences between Screen 1 and Screen 2"
                  className={`h-9 sm:h-8 inline-flex items-center gap-1 px-2.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    showLiveDiff
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Highlighter className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Live Diff</span>
                </button>

                {activeVersion.id !== referenceVersion.id && (
                  <button
                    type="button"
                    onClick={handleCopyScreen1ToScreen2}
                    title="Copy Screen 1 content into Screen 2"
                    className="h-9 sm:h-8 inline-flex items-center gap-1 px-2.5 text-xs font-medium bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden xl:inline">To Screen 2</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </button>
                )}
              </>
            }
            footerRightContent={
              liveDiff ? (
                <span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    +{liveDiff.addedWords}
                  </span>{' '}
                  /{' '}
                  <span className="text-rose-700 dark:text-rose-400">
                    −{liveDiff.removedWords}
                  </span>{' '}
                  words vs Screen 2
                </span>
              ) : undefined
            }
            onChangeAuthor={onChangeAuthor}
            onChangeTitle={(title) =>
              onUpdateVersionById(referenceVersion.id, (ver) => ({
                ...ver,
                title,
              }))
            }
            onChangeSubtitle={(subtitle) =>
              onUpdateVersionById(referenceVersion.id, (ver) => ({
                ...ver,
                subtitle,
              }))
            }
            onChangeContent={(contentHtml, contentText) =>
              onUpdateVersionById(referenceVersion.id, (ver) => ({
                ...ver,
                contentHtml,
                contentText,
              }))
            }
          />
        </section>

        {/* SCREEN 2 */}
        <section
          aria-label="Screen 2 essay editor"
          className={`${
            showScreen2 ? 'flex' : 'hidden lg:flex'
          } flex-col min-h-[380px] lg:h-full`}
        >
          <RichEditor
            version={activeVersion}
            author={author}
            font={font}
            compact
            screenLabel="Screen 2"
            versions={versions}
            onSelectVersion={onSelectActiveVersion}
            readOnly={screen2Locked}
            onToggleReadOnly={() => setScreen2Locked((prev) => !prev)}
            onChangeAuthor={onChangeAuthor}
            onChangeTitle={(title) =>
              onUpdateVersionById(activeVersion.id, (ver) => ({
                ...ver,
                title,
              }))
            }
            onChangeSubtitle={(subtitle) =>
              onUpdateVersionById(activeVersion.id, (ver) => ({
                ...ver,
                subtitle,
              }))
            }
            onChangeContent={(contentHtml, contentText) =>
              onUpdateVersionById(activeVersion.id, (ver) => ({
                ...ver,
                contentHtml,
                contentText,
              }))
            }
          />
        </section>
      </div>
    </div>
  );
};
