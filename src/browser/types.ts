export type InputField = HTMLInputElement | HTMLTextAreaElement;
export type SpellingHints = Readonly<Record<string, string | readonly string[]>>;

export interface Suggestion {
  readonly id: string;
  readonly text: string;
  readonly number: number;
  readonly kind: 'nepali' | 'english' | 'punctuation';
  readonly label?: string;
  readonly lang?: string;
  readonly custom: boolean;
}

export interface SuggestionState {
  readonly suggestions: readonly Suggestion[];
  readonly activeId: string | null;
  readonly open: boolean;
  readonly enabled: boolean;
  readonly numberShortcuts: boolean;
  readonly numberSelectionEnabled: boolean;
  readonly status: 'ready';
  readonly mode: 'word' | 'punctuation' | null;
  readonly word: string;
  readonly value: string;
}
