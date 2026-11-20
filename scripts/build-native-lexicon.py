"""Build a native spelling index from the pinned, separately licensed dictionary.

No evaluation cases, Google outputs, or occurrence counts are read. Hunspell
flags are removed; affix rules are deliberately not expanded. Output is a word
set with deterministic Roman signatures, not a pronunciation/frequency corpus.
"""
import hashlib
import json
import unicodedata
from pathlib import Path

engine = Path('src/engine') if Path('src/engine').is_dir() else Path('dist/engine')
source = engine / 'dictionary-source/ne_NP.dic'
expected = 'f3e8877d0f7f12c3ab7ef812388a77c20a9fcd3f8cc24d973709ec517150598d'
assert hashlib.sha256(source.read_bytes()).hexdigest() == expected
consonants = dict(zip('कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह',
                      ['k','kh','g','gh','ng','ch','chh','j','jh','ny','t','th','d','dh','n','t','th','d','dh','n','p','ph','b','bh','m','y','r','l','v','sh','sh','s','h']))
vowels = dict(zip('अआइईउऊऋॠएऐओऔ', ['a','aa','i','ii','u','uu','ri','ri','e','ai','o','au']))
signs = dict(zip('ािीुूृॄेैोौॅॉ', ['aa','i','ii','u','uu','ri','ri','e','ai','o','au','e','o']))

def romanize(word):
    result = ''
    i = 0
    while i < len(word):
        char = word[i]
        if char in consonants:
            result += consonants[char]
            after = word[i+1:i+2]
            if after == '्':
                i += 1
            elif after in signs:
                result += signs[after]
                i += 1
            elif i != len(word)-1:
                result += 'a'
        elif char in vowels:
            result += vowels[char]
        elif char in 'ँं':
            result += 'n'
        elif char == 'ः':
            result += 'h'
        else:
            return None
        i += 1
    return result

words = set()
for line in source.read_text().splitlines()[1:]:
    word = unicodedata.normalize('NFC', line.split('/')[0].strip()).replace('\u200c','').replace('\u200d','')
    if word and len(word) <= 64 and romanize(word):
        words.add(word)
rows = []
for word in sorted(words):
    forms = [romanize(word)]
    if any(mark in word for mark in 'ँं'):
        forms.append(romanize(word.replace('ँ','').replace('ं','')))
    if word[-1] in consonants:
        forms.extend(form+'a' for form in list(forms))
    rows.append([word, list(dict.fromkeys(forms))])
destination = engine / 'native-lexicon-data.js'
destination.write_text('// Derived from Madan Puraskar Pustakalaya Nepali dictionary, LGPL-2.1. See dictionary-source/ and MODEL-NOTICE.md.\nexport default '+json.dumps(rows,ensure_ascii=False,separators=(',',':'))+';\n')
provenance = {'source':'Madan Puraskar Pustakalaya Nepali SpellChecking Dictionary 1.1 (2006-10-17)',
              'repository':'https://github.com/LibreOffice/dictionaries',
              'revision':'c0865a85eb67dc377f2cf8e8fe2c4fa9e53f0dcb',
              'sourceUrl':'https://raw.githubusercontent.com/LibreOffice/dictionaries/c0865a85eb67dc377f2cf8e8fe2c4fa9e53f0dcb/ne_NP/ne_NP.dic',
              'license':'LGPL-2.1', 'sourceSha256':expected,
              'declaredRows':int(source.read_text().splitlines()[0]),
              'distinctAcceptedWords':len(rows), 'romanSignatures':sum(len(forms) for _,forms in rows),
              'processing':'Strip Hunspell flags; NFC; remove joiners; deduplicate; retain <=64-character words supported by the explicit native-to-Roman table. No affix expansion. Optional final schwa and nasal notation are retrieval aliases, not independent pronunciation annotations.',
              'use':'Lexical evidence only; no frequency counts, Google labels, or claim of modern spelling completeness.',
              'generatedSha256':hashlib.sha256(destination.read_bytes()).hexdigest()}
(engine / 'dictionary-source/provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n')
print(f'{len(rows)} distinct spellings, {sum(len(forms) for _,forms in rows)} Roman signatures; no affix expansion')
