import { diffArrays, diffWordsWithSpace } from 'diff';

export interface WordDiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface DiffSummary {
  parts: WordDiffPart[];
  addedWords: number;
  removedWords: number;
  unchangedWords: number;
  netDelta: number;
  similarityPercent: number;
}

export interface ParagraphDiffRow {
  id: string;
  status: 'unchanged' | 'modified' | 'added' | 'removed';
  oldParagraph: string;
  newParagraph: string;
  wordParts: WordDiffPart[];
  addedWords: number;
  removedWords: number;
}

function countWordsInString(str: string): number {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function computeWordDiff(oldText: string, newText: string): DiffSummary {
  const rawParts = diffWordsWithSpace(oldText || '', newText || '');
  let addedWords = 0;
  let removedWords = 0;
  let unchangedWords = 0;

  const parts: WordDiffPart[] = rawParts.map((part) => {
    const wCount = countWordsInString(part.value);
    if (part.added) addedWords += wCount;
    else if (part.removed) removedWords += wCount;
    else unchangedWords += wCount;

    return {
      value: part.value,
      added: part.added,
      removed: part.removed,
    };
  });

  const totalDenominator = unchangedWords + Math.max(addedWords, removedWords);
  const similarityPercent =
    totalDenominator === 0
      ? 100
      : Math.round((unchangedWords / totalDenominator) * 100);

  return {
    parts,
    addedWords,
    removedWords,
    unchangedWords,
    netDelta: addedWords - removedWords,
    similarityPercent,
  };
}

function splitParagraphs(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function computeParagraphDiff(
  oldText: string,
  newText: string
): ParagraphDiffRow[] {
  const oldParas = splitParagraphs(oldText);
  const newParas = splitParagraphs(newText);

  const chunks = diffArrays(oldParas, newParas);
  const rows: ParagraphDiffRow[] = [];

  let idx = 0;
  let rowId = 0;

  while (idx < chunks.length) {
    const current = chunks[idx];
    const next = chunks[idx + 1];

    if (current.removed && next && next.added) {
      // Pair removed and added paragraphs one-by-one as modified rows when adjacent
      const removedList = current.value;
      const addedList = next.value;
      const maxLen = Math.max(removedList.length, addedList.length);

      for (let i = 0; i < maxLen; i++) {
        const oldP = removedList[i] ?? '';
        const newP = addedList[i] ?? '';

        if (oldP && newP) {
          const wordDiff = computeWordDiff(oldP, newP);
          rows.push({
            id: `para-diff-${rowId++}`,
            status: 'modified',
            oldParagraph: oldP,
            newParagraph: newP,
            wordParts: wordDiff.parts,
            addedWords: wordDiff.addedWords,
            removedWords: wordDiff.removedWords,
          });
        } else if (oldP) {
          rows.push({
            id: `para-diff-${rowId++}`,
            status: 'removed',
            oldParagraph: oldP,
            newParagraph: '',
            wordParts: [{ value: oldP, removed: true }],
            addedWords: 0,
            removedWords: countWordsInString(oldP),
          });
        } else if (newP) {
          rows.push({
            id: `para-diff-${rowId++}`,
            status: 'added',
            oldParagraph: '',
            newParagraph: newP,
            wordParts: [{ value: newP, added: true }],
            addedWords: countWordsInString(newP),
            removedWords: 0,
          });
        }
      }
      idx += 2;
      continue;
    }

    if (current.removed) {
      for (const oldP of current.value) {
        rows.push({
          id: `para-diff-${rowId++}`,
          status: 'removed',
          oldParagraph: oldP,
          newParagraph: '',
          wordParts: [{ value: oldP, removed: true }],
          addedWords: 0,
          removedWords: countWordsInString(oldP),
        });
      }
    } else if (current.added) {
      for (const newP of current.value) {
        rows.push({
          id: `para-diff-${rowId++}`,
          status: 'added',
          oldParagraph: '',
          newParagraph: newP,
          wordParts: [{ value: newP, added: true }],
          addedWords: countWordsInString(newP),
          removedWords: 0,
        });
      }
    } else {
      for (const sameP of current.value) {
        rows.push({
          id: `para-diff-${rowId++}`,
          status: 'unchanged',
          oldParagraph: sameP,
          newParagraph: sameP,
          wordParts: [{ value: sameP }],
          addedWords: 0,
          removedWords: 0,
        });
      }
    }

    idx += 1;
  }

  return rows;
}
