export interface LexiconEntry {
  text: string;
  spellings: string[];
  nominal: boolean;
  vettedAlternatives?: boolean;
}

export interface RankedSuggestion {
  text: string;
  score: number;
  source: string;
  nameForm?: boolean;
  vetted?: boolean;
  recallHint?: boolean;
  volitional?: boolean;
  originalSource?: string;
  replaceBefore?: string;
  reason?: string;
}

export type UnitCounts = Record<number, number>;
export type UnitContext = [count: number, types: number, values: UnitCounts];
export interface UnitLanguageModel {
  training: unknown;
  unigrams: UnitCounts;
  bigrams: Record<string, UnitContext>;
  trigrams: Record<string, UnitContext>;
}
