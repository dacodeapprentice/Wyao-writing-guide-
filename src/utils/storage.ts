import type {
  EditorPreferences,
  EssayDocument,
  EssayVersion,
} from '../types/essay';
import { htmlToPlainText } from './textUtils';

const ESSAYS_STORAGE_KEY = 'folio_essays_v1';
const ACTIVE_ESSAY_KEY = 'folio_active_essay_id_v1';
const PREFS_STORAGE_KEY = 'folio_prefs_v1';

export function createStarterEssay(): EssayDocument {
  const now = Date.now();
  const v1Time = new Date(now - 1000 * 60 * 95).toISOString();
  const v2Time = new Date(now - 1000 * 60 * 12).toISOString();

  const v1Html = [
    '<p>Modern reading habits favor speed over comprehension. We skim headlines, scan bullet points, and jump across hyperlinks without letting an argument settle. Yet complex thought requires sustained attention and room for friction.</p>',
    '<h2>The Cost of Frictionless Text</h2>',
    '<p>When platforms optimize every interface for rapid consumption, readers begin to treat essays like status updates. Subtle caveats get ignored, and nuanced reasoning is flattened into quick takeaways.</p>',
    '<blockquote>To read slowly is to enter into a deliberate conversation with another mind across time.</blockquote>',
    '<p>Slow reading does not mean reading less efficiently; it means matching the pace of reading to the density of the idea. Pencils in margins, pauses between paragraphs, and second readings all transform passive reception into active thought.</p>',
  ].join('');

  const v2Html = [
    '<p>Contemporary reading habits overwhelmingly favor velocity over comprehension. We skim opening sentences, scan bolded summaries, and leap across hyperlinks before an argument has had time to settle. Yet rigorous thought requires sustained attention—and a willingness to linger with productive friction.</p>',
    '<h2>The Hidden Cost of Frictionless Text</h2>',
    '<p>When digital interfaces optimize every page for effortless skimming, readers begin to treat thoughtful essays like fleeting dispatches. Subtle qualifications disappear, counterarguments are overlooked, and careful reasoning is flattened into quick takeaways.</p>',
    '<blockquote>To read slowly is to enter into a deliberate conversation with another mind—one that resists being compressed into a summary.</blockquote>',
    '<h2>Reclaiming Deliberate Pace</h2>',
    '<p>Slow reading does not mean reading inefficiently; it means calibrating our pace to the density of the prose. Marginalia, deliberate pauses between sections, and returning for a second pass transform passive consumption into genuine intellectual inquiry.</p>',
  ].join('');

  const v1: EssayVersion = {
    id: 'ver-starter-1',
    versionNumber: 1,
    label: 'Initial Draft',
    title: 'On Slow Reading in an Age of Skimming',
    subtitle: 'Why deliberate attention remains essential for clear thinking',
    contentHtml: v1Html,
    contentText: htmlToPlainText(v1Html),
    createdAt: v1Time,
    updatedAt: v1Time,
    parentVersionId: null,
    creationMode: 'original',
    notes: 'First freewrite capturing core thesis and examples.',
  };

  const v2: EssayVersion = {
    id: 'ver-starter-2',
    versionNumber: 2,
    label: 'Revised Structure',
    title: 'On Slow Reading in an Age of Skimming',
    subtitle: 'Why deliberate attention remains essential for clear thinking',
    contentHtml: v2Html,
    contentText: htmlToPlainText(v2Html),
    createdAt: v2Time,
    updatedAt: v2Time,
    parentVersionId: 'ver-starter-1',
    creationMode: 'copy_and_edit',
    notes: 'Sharpened opening hook, added second section heading, and refined verbs.',
  };

  return {
    id: 'essay-starter-slow-reading',
    author: 'Elena Vance',
    wordGoal: 800,
    thesis:
      'Deliberate, friction-friendly reading practices preserve analytical depth that speed-optimized interfaces erode.',
    outline: [
      {
        id: 'out-1',
        heading: 'Introduction: Velocity vs. Comprehension',
        summary: 'Contrast skimming habits with sustained intellectual friction.',
        completed: true,
      },
      {
        id: 'out-2',
        heading: 'The Hidden Cost of Frictionless Text',
        summary: 'Explain how interface speed flattens nuance and caveats.',
        completed: true,
      },
      {
        id: 'out-3',
        heading: 'Reclaiming Deliberate Pace',
        summary: 'Concrete practices: marginalia, second passes, slow synthesis.',
        completed: false,
      },
      {
        id: 'out-4',
        heading: 'Conclusion: Attention as Craft',
        summary: 'Tie reading rhythm directly to writing clarity.',
        completed: false,
      },
    ],
    scratchpad:
      'Quote to verify: Sven Birkerts, The Gutenberg Elegies (1994) on deep reading.\nContrast: skimming is navigational; reading is inhabitation.',
    versions: [v1, v2],
    activeVersionId: v2.id,
    referenceVersionId: v1.id,
    createdAt: v1Time,
    updatedAt: v2Time,
  };
}

export function createBlankEssay(title = 'Untitled Essay'): EssayDocument {
  const now = new Date().toISOString();
  const verId = `ver-${Date.now()}`;
  const v1: EssayVersion = {
    id: verId,
    versionNumber: 1,
    label: 'First Draft',
    title,
    subtitle: '',
    contentHtml: '',
    contentText: '',
    createdAt: now,
    updatedAt: now,
    parentVersionId: null,
    creationMode: 'original',
    notes: 'Initial blank draft.',
  };

  return {
    id: `essay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    author: '',
    wordGoal: 1000,
    thesis: '',
    outline: [
      {
        id: `out-${Date.now()}-1`,
        heading: 'Introduction & Hook',
        summary: 'Establish context and lead toward your central claim.',
        completed: false,
      },
      {
        id: `out-${Date.now()}-2`,
        heading: 'Body Arguments',
        summary: 'Develop supporting evidence and analysis.',
        completed: false,
      },
      {
        id: `out-${Date.now()}-3`,
        heading: 'Counterargument & Conclusion',
        summary: 'Address objections and synthesize your thesis.',
        completed: false,
      },
    ],
    scratchpad: '',
    versions: [v1],
    activeVersionId: verId,
    referenceVersionId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function loadEssaysFromStorage(): EssayDocument[] {
  try {
    const raw = localStorage.getItem(ESSAYS_STORAGE_KEY);
    if (!raw) {
      const starter = createStarterEssay();
      saveEssaysToStorage([starter]);
      return [starter];
    }
    const parsed = JSON.parse(raw) as EssayDocument[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const starter = createStarterEssay();
      saveEssaysToStorage([starter]);
      return [starter];
    }
    return parsed;
  } catch {
    return [createStarterEssay()];
  }
}

export function saveEssaysToStorage(essays: EssayDocument[]): void {
  try {
    localStorage.setItem(ESSAYS_STORAGE_KEY, JSON.stringify(essays));
  } catch {
    // Ignore storage quota issues silently
  }
}

export function loadActiveEssayId(essays: EssayDocument[]): string {
  try {
    const saved = localStorage.getItem(ACTIVE_ESSAY_KEY);
    if (saved && essays.some((e) => e.id === saved)) {
      return saved;
    }
  } catch {
    // Ignore
  }
  return essays[0]?.id ?? '';
}

export function saveActiveEssayId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_ESSAY_KEY, id);
  } catch {
    // Ignore
  }
}

export function loadPreferences(): EditorPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { theme: 'light', font: 'serif' };
    const parsed = JSON.parse(raw) as Partial<EditorPreferences>;
    return {
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      font: parsed.font === 'sans' ? 'sans' : 'serif',
    };
  } catch {
    return { theme: 'light', font: 'serif' };
  }
}

export function savePreferences(prefs: EditorPreferences): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore
  }
}
