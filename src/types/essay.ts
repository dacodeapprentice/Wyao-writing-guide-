export type VersionCreationMode =
  | 'original'
  | 'scratch_alongside'
  | 'copy_and_edit'
  | 'imported';

export interface EssayVersion {
  id: string;
  versionNumber: number;
  label: string;
  title: string;
  subtitle: string;
  contentHtml: string;
  contentText: string;
  createdAt: string;
  updatedAt: string;
  parentVersionId: string | null;
  creationMode: VersionCreationMode;
  notes: string;
}

export interface EssayOutlineItem {
  id: string;
  heading: string;
  summary: string;
  completed: boolean;
}

export interface EssayDocument {
  id: string;
  author: string;
  wordGoal: number;
  thesis: string;
  outline: EssayOutlineItem[];
  scratchpad: string;
  versions: EssayVersion[];
  activeVersionId: string;
  referenceVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type WorkspaceMode = 'write' | 'split' | 'track';

export type ExportFormat = 'docx' | 'pdf' | 'markdown' | 'txt' | 'bundle';

export type ExportStyle = 'editorial' | 'academic';

export type EditorFont = 'serif' | 'sans';

export type ThemeMode = 'light' | 'dark';

export interface EditorPreferences {
  theme: ThemeMode;
  font: EditorFont;
}
