import { prepareRoman } from './rules.js';
import { validNepaliSequence } from './syllables.js';
const scopes=new Set(['','locative','first-singular','first-plural','second','water','closure','clock']);
const keyFor=(roman: string, scope='')=>prepareRoman(roman)+(scope?'\t'+scope:'');

export class SpellingPreferences {
  private readonly words = new Map<string, Map<string, number>>();

  constructor(saved: { version?: unknown; words?: unknown } | null = {}) {
    if (typeof saved?.version !== 'number' || ![1, 2, 3].includes(saved.version) || !Array.isArray(saved.words)) return;
    for (const row of saved.words.slice(-250)) {
      if (!Array.isArray(row) || row.length < 2 || row.length > 3) continue;
      const [roman, spellings, scope=''] = row;
      if (typeof roman !== 'string' || !/^[a-zA-Z]{1,64}$/.test(roman) || !Array.isArray(spellings)) continue;
      if(!scopes.has(scope)||(saved.version!==3&&scope))continue;
      const valid = spellings.filter((item): item is [string, number] => Array.isArray(item) && validSpelling(item[0]) && Number.isInteger(item[1]) && item[1] > 0 && item[1] <= 100);
      // Version 1 discarded vowel length and other distinctions. Its original
      // input cannot be recovered: retain the stored key as an exact form only.
      if (valid.length) this.words.set(keyFor(roman,scope), new Map(valid.slice(-5)));
    }
  }
  record(roman: string, text: string, {scope=''} = {}) {
    if (typeof roman!=='string' || !/^[a-zA-Z]{1,64}$/.test(roman) || !validSpelling(text) || !scopes.has(scope)) return;
    const key = keyFor(roman,scope);
    const spellings = this.words.get(key) || new Map<string, number>();
    const count = Math.min(100, (spellings.get(text) || 0) + 1);
    spellings.delete(text);
    spellings.set(text, count);
    if (spellings.size > 5) spellings.delete(spellings.keys().next().value!);
    this.words.delete(key);
    this.words.set(key, spellings);
    if (this.words.size > 250) this.words.delete(this.words.keys().next().value!);
  }
  forWord(roman: string) { return this.words.get(typeof roman === 'string' ? prepareRoman(roman) : '') || new Map<string, number>(); }
  forContext(roman: string, scope: string) { return typeof roman==='string'&&scope&&scopes.has(scope)?this.words.get(keyFor(roman,scope))||new Map<string, number>():new Map<string, number>(); }
  clear() { this.words.clear(); }
  get size() { return new Set([...this.words.keys()].map(key=>key.split('\t')[0])).size; }
  toJSON() { return { version: 3, words: [...this.words].map(([key, spellings]) => {const [roman,scope='']=key.split('\t');return [roman,[...spellings],scope];}) }; }
}

function validSpelling(text: unknown): text is string {
  return typeof text === 'string' && text.length <= 128 && validNepaliSequence(text);
}
