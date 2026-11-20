import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronsUpDown,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Lock,
  LockOpen,
  Redo2,
  RemoveFormatting,
  Search,
  Strikethrough,
  Underline,
  Undo2,
  X,
} from 'lucide-react';
import type { EditorFont, EssayVersion } from '../types/essay';
import {
  formatDateLabel,
  getTextMetrics,
  htmlToPlainText,
  sanitizeEditorHtml,
} from '../utils/textUtils';

type ParagraphStyle = 'P' | 'H1' | 'H2' | 'H3' | 'BLOCKQUOTE';
type LineSpacingOption = '1.15' | '1.5' | '2.0';

interface RichEditorProps {
  version: EssayVersion;
  author: string;
  font: EditorFont;
  compact?: boolean;
  fluidHeightOnSmall?: boolean;
  screenLabel?: string;
  versions?: EssayVersion[];
  onSelectVersion?: (versionId: string) => void;
  readOnly?: boolean;
  onToggleReadOnly?: () => void;
  extraHeaderActions?: React.ReactNode;
  customBodyOverlay?: React.ReactNode;
  footerRightContent?: React.ReactNode;
  onChangeAuthor: (author: string) => void;
  onChangeTitle: (title: string) => void;
  onChangeSubtitle: (subtitle: string) => void;
  onChangeContent: (html: string, plainText: string) => void;
}

export const RichEditor: React.FC<RichEditorProps> = ({
  version,
  author,
  font,
  compact = false,
  fluidHeightOnSmall = false,
  screenLabel,
  versions,
  onSelectVersion,
  readOnly = false,
  onToggleReadOnly,
  extraHeaderActions,
  customBodyOverlay,
  footerRightContent,
  onChangeAuthor,
  onChangeTitle,
  onChangeSubtitle,
  onChangeContent,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const subtitleRef = useRef<HTMLTextAreaElement>(null);
  const lastEmittedHtmlRef = useRef<string>(version.contentHtml);
  const lastVersionIdRef = useRef<string>(version.id);

  const [blockStyle, setBlockStyle] = useState<ParagraphStyle>('P');
  const [lineSpacing, setLineSpacing] = useState<LineSpacingOption>('1.5');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [findFeedback, setFindFeedback] = useState<string | null>(null);
  const [scrollWithinWindow, setScrollWithinWindow] = useState(true);

  const autoResizeTextarea = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    autoResizeTextarea(titleRef.current);
    autoResizeTextarea(subtitleRef.current);
  }, [version.title, version.subtitle, version.id, compact, autoResizeTextarea]);

  useEffect(() => {
    const onResize = () => {
      autoResizeTextarea(titleRef.current);
      autoResizeTextarea(subtitleRef.current);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [autoResizeTextarea]);

  // Sync innerHTML only on version switch or external replacement (import, revert hunk, copy-to-right)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const versionChanged = lastVersionIdRef.current !== version.id;
    const externallyUpdated = version.contentHtml !== lastEmittedHtmlRef.current;

    if (versionChanged || externallyUpdated) {
      el.innerHTML = version.contentHtml || '';
      lastVersionIdRef.current = version.id;
      lastEmittedHtmlRef.current = version.contentHtml;
    }
  }, [version.id, version.contentHtml, customBodyOverlay]);

  const syncSelectionState = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    if (!el.contains(selection.anchorNode)) return;

    const current = (document.queryCommandValue('formatBlock') || '').toUpperCase();
    if (
      current === 'H1' ||
      current === 'H2' ||
      current === 'H3' ||
      current === 'BLOCKQUOTE'
    ) {
      setBlockStyle(current);
    } else {
      setBlockStyle('P');
    }
  }, []);

  const emitChange = () => {
    if (readOnly) return;
    const el = editorRef.current;
    if (!el) return;
    const rawHtml = el.innerHTML;
    const normalizedHtml =
      rawHtml === '<br>' || rawHtml === '<p><br></p>' ? '' : rawHtml;
    lastEmittedHtmlRef.current = normalizedHtml;
    const plain = htmlToPlainText(normalizedHtml);
    onChangeContent(normalizedHtml, plain);
  };

  const execFormat = (command: string, value?: string) => {
    if (readOnly) return;
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, value);
    emitChange();
    syncSelectionState();
  };

  const applyBlockStyle = (tagName: ParagraphStyle) => {
    if (readOnly) return;
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand('formatBlock', false, tagName);
    setBlockStyle(tagName);
    emitChange();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const htmlData = e.clipboardData.getData('text/html');
    const textData = e.clipboardData.getData('text/plain');
    if (htmlData) {
      e.preventDefault();
      const cleaned = sanitizeEditorHtml(htmlData);
      document.execCommand('insertHTML', false, cleaned);
      emitChange();
    } else if (textData) {
      e.preventDefault();
      document.execCommand('insertText', false, textData);
      emitChange();
    }
  };

  const handleReplaceNext = () => {
    if (readOnly || !findQuery.trim()) return;
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    let replaced = false;
    const updated = html
      .split(/(<[^>]+>)/g)
      .map((part) => {
        if (replaced || part.startsWith('<')) return part;
        if (regex.test(part)) {
          replaced = true;
          return part.replace(regex, replaceQuery);
        }
        return part;
      })
      .join('');

    if (replaced) {
      el.innerHTML = updated;
      emitChange();
      setFindFeedback('Replaced 1 match');
    } else {
      setFindFeedback('No match found');
    }
    setTimeout(() => setFindFeedback(null), 2000);
  };

  const handleReplaceAll = () => {
    if (readOnly || !findQuery.trim()) return;
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    let count = 0;
    const updated = html
      .split(/(<[^>]+>)/g)
      .map((part) => {
        if (part.startsWith('<')) return part;
        return part.replace(regex, () => {
          count++;
          return replaceQuery;
        });
      })
      .join('');

    if (count > 0) {
      el.innerHTML = updated;
      emitChange();
      setFindFeedback(`Replaced ${count} ${count === 1 ? 'match' : 'matches'}`);
    } else {
      setFindFeedback('No matches found');
    }
    setTimeout(() => setFindFeedback(null), 2200);
  };

  const metrics = getTextMetrics(version.contentText);
  const wordsPerPage = lineSpacing === '2.0' ? 275 : lineSpacing === '1.5' ? 350 : 450;
  const estimatedPages = Math.max(1, Math.ceil(metrics.words / wordsPerPage));

  const lineHeightClass =
    lineSpacing === '2.0'
      ? 'leading-[2.05]'
      : lineSpacing === '1.5'
      ? 'leading-[1.72]'
      : 'leading-[1.42]';

  const toolbarGroups: {
    label: string;
    icon: React.FC<{ className?: string }>;
    action: () => void;
    dividerBefore?: boolean;
  }[] = [
    { label: 'Undo', icon: Undo2, action: () => execFormat('undo') },
    { label: 'Redo', icon: Redo2, action: () => execFormat('redo') },
    { label: 'Bold', icon: Bold, action: () => execFormat('bold'), dividerBefore: true },
    { label: 'Italic', icon: Italic, action: () => execFormat('italic') },
    { label: 'Underline', icon: Underline, action: () => execFormat('underline') },
    { label: 'Strikethrough', icon: Strikethrough, action: () => execFormat('strikeThrough') },
    {
      label: 'Clear Formatting',
      icon: RemoveFormatting,
      action: () => {
        execFormat('removeFormat');
        applyBlockStyle('P');
      },
    },
    {
      label: 'Align Left',
      icon: AlignLeft,
      action: () => execFormat('justifyLeft'),
      dividerBefore: true,
    },
    {
      label: 'Align Center',
      icon: AlignCenter,
      action: () => execFormat('justifyCenter'),
    },
    {
      label: 'Align Right',
      icon: AlignRight,
      action: () => execFormat('justifyRight'),
    },
    {
      label: 'Justify',
      icon: AlignJustify,
      action: () => execFormat('justifyFull'),
    },
    {
      label: 'Bulleted List',
      icon: List,
      action: () => execFormat('insertUnorderedList'),
      dividerBefore: true,
    },
    {
      label: 'Numbered List',
      icon: ListOrdered,
      action: () => execFormat('insertOrderedList'),
    },
    {
      label: 'Decrease Indent',
      icon: IndentDecrease,
      action: () => execFormat('outdent'),
    },
    {
      label: 'Increase Indent',
      icon: IndentIncrease,
      action: () => execFormat('indent'),
    },
  ];

  return (
    <div
      className={`flex flex-col w-full min-w-0 bg-zinc-100/90 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden ${
        fluidHeightOnSmall ? 'lg:h-full' : 'h-full'
      }`}
    >
      {/* Optional Screen Header Bar (used in Two-Screen Split Revision) */}
      {(screenLabel || (versions && onSelectVersion) || extraHeaderActions) && (
        <div className="px-3 sm:px-3.5 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {screenLabel && (
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                {screenLabel}
              </span>
            )}
            {screenLabel && versions && onSelectVersion && (
              <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">
                ·
              </span>
            )}
            {versions && onSelectVersion && (
              <>
                <label
                  htmlFor={`screen-select-${screenLabel || version.id}`}
                  className="sr-only"
                >
                  {screenLabel ? `${screenLabel} Version` : 'Select Version'}
                </label>
                <select
                  id={`screen-select-${screenLabel || version.id}`}
                  value={version.id}
                  onChange={(e) => onSelectVersion(e.target.value)}
                  className="h-9 sm:h-8 pl-2 pr-6 text-xs font-medium bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 max-w-[160px] sm:max-w-[180px] truncate"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} · {v.label}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {fluidHeightOnSmall && (
              <button
                type="button"
                onClick={() => setScrollWithinWindow((prev) => !prev)}
                aria-pressed={scrollWithinWindow}
                title={
                  scrollWithinWindow
                    ? 'Scrolling inside this window (click to expand full length)'
                    : 'Expanded full length (click to scroll inside this window)'
                }
                className={`lg:hidden h-9 sm:h-8 inline-flex items-center gap-1 px-2.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  scrollWithinWindow
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <ChevronsUpDown className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{scrollWithinWindow ? 'Scroll' : 'Expanded'}</span>
              </button>
            )}
            {onToggleReadOnly && (
              <button
                type="button"
                onClick={onToggleReadOnly}
                aria-pressed={readOnly}
                title={
                  readOnly
                    ? 'Unlock this screen for editing'
                    : 'Lock this screen as read-only'
                }
                className={`h-9 sm:h-8 inline-flex items-center gap-1 px-2.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  readOnly
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                    : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {readOnly ? (
                  <>
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Locked</span>
                  </>
                ) : (
                  <>
                    <LockOpen className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Editable</span>
                  </>
                )}
              </button>
            )}
            {extraHeaderActions}
          </div>
        </div>
      )}

      {/* Universal Word / Google Docs / LibreOffice Formatting Ribbon */}
      <div className="px-2.5 sm:px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-2 shrink-0 min-w-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          {/* Paragraph Style Dropdown */}
          <label htmlFor={`style-select-${screenLabel || version.id}`} className="sr-only">
            Paragraph style
          </label>
          <select
            id={`style-select-${screenLabel || version.id}`}
            value={blockStyle}
            disabled={readOnly || Boolean(customBodyOverlay)}
            onChange={(e) => applyBlockStyle(e.target.value as ParagraphStyle)}
            className="h-9 sm:h-8 px-2 text-xs font-medium bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-40 shrink-0"
          >
            <option value="P">Normal text</option>
            <option value="H1">Heading 1</option>
            <option value="H2">Heading 2</option>
            <option value="H3">Heading 3</option>
            <option value="BLOCKQUOTE">Block Quote</option>
          </select>

          <span
            aria-hidden="true"
            className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1 shrink-0"
          />

          {/* Undo/Redo, Character Formatting, Alignment, Lists & Indent */}
          {toolbarGroups.map((btn) => {
            const Icon = btn.icon;
            return (
              <React.Fragment key={btn.label}>
                {btn.dividerBefore && (
                  <span
                    aria-hidden="true"
                    className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1 shrink-0"
                  />
                )}
                <button
                  type="button"
                  title={btn.label}
                  aria-label={btn.label}
                  disabled={readOnly || Boolean(customBodyOverlay)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    btn.action();
                  }}
                  className="min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </button>
              </React.Fragment>
            );
          })}

          <span
            aria-hidden="true"
            className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1 shrink-0"
          />

          {/* Line Spacing Dropdown */}
          <label htmlFor={`spacing-select-${screenLabel || version.id}`} className="sr-only">
            Line spacing
          </label>
          <select
            id={`spacing-select-${screenLabel || version.id}`}
            value={lineSpacing}
            onChange={(e) => setLineSpacing(e.target.value as LineSpacingOption)}
            title="Line spacing"
            className="h-9 sm:h-8 px-2 text-xs font-medium bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 shrink-0 tabular-nums"
          >
            <option value="1.15">1.15×</option>
            <option value="1.5">1.5×</option>
            <option value="2.0">2.0×</option>
          </select>

          {/* Find & Replace Toggle */}
          <button
            type="button"
            title="Find and replace"
            aria-label="Find and replace"
            aria-pressed={showFindReplace}
            onClick={() => setShowFindReplace((prev) => !prev)}
            className={`min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-md transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              showFindReplace
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Search className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="hidden lg:block text-xs text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap shrink-0 pl-2">
          v{version.versionNumber} · {version.label}
        </div>
      </div>

      {/* Inline Find & Replace Bar */}
      {showFindReplace && !customBodyOverlay && (
        <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 flex flex-wrap items-center gap-2 shrink-0">
          <input
            type="text"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            placeholder="Find text..."
            aria-label="Find text"
            className="h-9 sm:h-8 w-36 sm:w-44 px-2.5 text-xs bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          {!readOnly && (
            <>
              <input
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replace with..."
                aria-label="Replace with"
                className="h-9 sm:h-8 w-36 sm:w-44 px-2.5 text-xs bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={handleReplaceNext}
                className="h-9 sm:h-8 px-2.5 text-xs font-medium bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors whitespace-nowrap"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleReplaceAll}
                className="h-9 sm:h-8 px-2.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors whitespace-nowrap"
              >
                Replace All
              </button>
            </>
          )}
          {findFeedback && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {findFeedback}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowFindReplace(false)}
            aria-label="Close find and replace"
            className="ml-auto h-8 w-8 inline-flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Word-Processor Desk + Centered Paper Page */}
      <div
        className={`p-2 sm:p-4 lg:p-6 ${
          fluidHeightOnSmall
            ? scrollWithinWindow
              ? 'max-h-[54vh] sm:max-h-[58vh] overflow-y-auto overscroll-y-contain lg:max-h-none lg:flex-1 lg:overflow-y-auto'
              : 'lg:flex-1 lg:overflow-y-auto'
            : 'flex-1 min-h-[240px] max-h-[calc(100dvh-17.5rem)] md:max-h-[calc(100dvh-12rem)] lg:max-h-none overflow-y-auto overscroll-y-contain'
        }`}
      >
        <div
          className={`mx-auto w-full bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 shadow-xs rounded-sm sm:rounded-md ${
            fluidHeightOnSmall ? 'lg:min-h-full' : 'min-h-full'
          } ${
            compact
              ? 'max-w-[720px] px-4 py-5 sm:px-8 sm:py-7 lg:px-10 lg:py-9'
              : 'max-w-[816px] px-4 py-5 sm:px-12 sm:py-10 md:px-16 md:py-12'
          }`}
        >
          {/* Running Page Header (Word/Docs style) */}
          <div className="mb-5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 dark:text-zinc-500">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <label
                htmlFor={`author-${screenLabel || 'main'}-${version.id}`}
                className="sr-only"
              >
                Author name
              </label>
              <input
                id={`author-${screenLabel || 'main'}-${version.id}`}
                type="text"
                value={author}
                readOnly={readOnly}
                onChange={(e) => onChangeAuthor(e.target.value)}
                placeholder="Author name"
                className="bg-transparent text-xs font-medium text-zinc-600 dark:text-zinc-300 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:text-zinc-900 dark:focus:text-zinc-100 w-full max-w-[220px] min-w-0"
              />
            </div>
            <span className="tabular-nums whitespace-nowrap shrink-0">
              {formatDateLabel(version.updatedAt)} · v{version.versionNumber}
            </span>
          </div>

          {/* Document Title & Subtitle (wrapping textareas so long titles never clip) */}
          <div className="mb-5">
            <label
              htmlFor={`title-${screenLabel || 'main'}-${version.id}`}
              className="sr-only"
            >
              Document title
            </label>
            <textarea
              ref={titleRef}
              id={`title-${screenLabel || 'main'}-${version.id}`}
              rows={1}
              value={version.title}
              readOnly={readOnly}
              onChange={(e) => {
                onChangeTitle(e.target.value);
                autoResizeTextarea(e.target);
              }}
              placeholder="Untitled Essay"
              className={`w-full bg-transparent font-bold tracking-tight leading-tight text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-300 dark:placeholder:text-zinc-700 focus:outline-none resize-none overflow-hidden break-words ${
                compact ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-2xl sm:text-3xl md:text-4xl'
              } ${font === 'serif' ? 'font-serif-prose' : 'font-sans-ui'}`}
            />

            <label
              htmlFor={`subtitle-${screenLabel || 'main'}-${version.id}`}
              className="sr-only"
            >
              Subtitle or central premise
            </label>
            <textarea
              ref={subtitleRef}
              id={`subtitle-${screenLabel || 'main'}-${version.id}`}
              rows={1}
              value={version.subtitle}
              readOnly={readOnly}
              onChange={(e) => {
                onChangeSubtitle(e.target.value);
                autoResizeTextarea(e.target);
              }}
              placeholder="Add a subtitle or guiding premise..."
              className={`mt-2 w-full bg-transparent text-sm sm:text-base leading-snug text-zinc-500 dark:text-zinc-400 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none resize-none overflow-hidden break-words ${
                font === 'serif' ? 'font-serif-prose italic' : 'font-sans-ui'
              }`}
            />
          </div>

          {/* Document Body Canvas */}
          {customBodyOverlay ? (
            customBodyOverlay
          ) : (
            <div
              ref={editorRef}
              contentEditable={!readOnly}
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-readonly={readOnly}
              aria-label={
                screenLabel
                  ? `${screenLabel} essay body editor`
                  : 'Essay body editor'
              }
              data-placeholder="Start typing your document..."
              onInput={emitChange}
              onKeyUp={syncSelectionState}
              onMouseUp={syncSelectionState}
              onPaste={handlePaste}
              className={`essay-prose text-zinc-800 dark:text-zinc-200 ${lineHeightClass} ${
                fluidHeightOnSmall
                  ? 'min-h-[200px] sm:min-h-[240px] lg:min-h-[380px]'
                  : 'min-h-[320px] sm:min-h-[440px]'
              } ${font === 'serif' ? 'font-serif-prose' : 'font-sans-ui'}`}
            />
          )}
        </div>
      </div>

      {/* Universal Word / LibreOffice Status Bar */}
      <div className="px-3.5 sm:px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <span>
            Page 1 of {estimatedPages}
          </span>
          <span aria-hidden="true">·</span>
          <span>{metrics.words.toLocaleString()} words</span>
          <span className="hidden sm:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden sm:inline">
            {metrics.characters.toLocaleString()} characters
          </span>
          <span className="hidden md:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden md:inline">{metrics.paragraphs} paragraphs</span>
        </div>
        <div>
          {footerRightContent ??
            (metrics.words > 0
              ? `~${metrics.readingMinutes} min read`
              : 'Ready to write')}
        </div>
      </div>
    </div>
  );
};
