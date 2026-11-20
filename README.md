# Nepalipi

Browser SDK for typing Nepali with Roman letters. The transliteration engine,
model data, and per-field spelling hints run on the device.

## Credits

**AI4Bharat Aksharantar** provided the Nepali training data used to build
Nepalipi’s transliteration model. Thanks to the AI4Bharat dataset team,
the annotators, and paper authors Yash Madhani, Sushane Parthan, Priyanka
Bedekar, Gokul NC, Ruchi Khapra, Anoop Kunchukuttan, Pratyush Kumar, and
Mitesh M. Khapra.
[Pinned dataset card](https://huggingface.co/datasets/ai4bharat/Aksharantar/blob/e418c1fc928d9f5393af33268472cf20c1891be8/README.md) ·
[Aksharantar paper](https://aclanthology.org/2023.findings-emnlp.4/)

**Madan Puraskar Pustakalaya** compiled the Nepali SpellChecking Dictionary
that supplies Nepalipi’s native spelling lexicon. Thanks to Amar Gurung,
Bal Krishna Bal, Basanta Karki, Basanta Shrestha, Ishwor Sharma, Laxmi
Prasad Khatiwada, Paras Pradhan, Prajol Shrestha, and Subir Pradhanang.
The original notice also thanks NUCES in Pakistan and IDRC Canada’s Pan
Asia Networking program.
[Pinned LibreOffice source](https://github.com/LibreOffice/dictionaries/tree/c0865a85eb67dc377f2cf8e8fe2c4fa9e53f0dcb/ne_NP) ·
[Original contributor notice](https://github.com/LibreOffice/dictionaries/blob/c0865a85eb67dc377f2cf8e8fe2c4fa9e53f0dcb/ne_NP/README_ne_NP.txt)

See [license scope and bundled notices](LICENSES.md).

## Install

```sh
npm install nepalipi
```

## Browser integration

Attach the SDK to a native text or search input or textarea. The example below
assumes a `<textarea id="message"></textarea>` in the page and an npm-aware
bundler. To self-host without a bundler, serve the entire `dist/` directory and
import `./dist/index.js` from your browser module.

```js
import { NepaliPi } from 'nepalipi';

const field = NepaliPi('#message', {
  hints: { pani: ['पानी', 'पनि'] },
});
const unsubscribe = field.subscribe(state => {
  // Use state.suggestions to render your own list.
});

// Call field.choose(suggestion.id) when the user selects an option.
// Call unsubscribe() and field.destroy() when the field is removed.
```

The controller handles shortcuts and text replacement. The app owns popup
markup and styles. Use `field.getInputAttributes()`, `field.getListAttributes()`
and `field.getOptionAttributes(id)` for accessible rendering. The ES module
also exposes `window.NepaliPi` in the browser.

## Module formats

JavaScript and TypeScript can use `import { NepaliPi } from 'nepalipi'`. The
default export is also available. For CommonJS, use:

```js
const { NepaliPi } = require('nepalipi');
```

For a TypeScript CommonJS file (`.cts`), use `import sdk = require('nepalipi')`
to get the same typed interface. Both formats share one runtime. CommonJS
uses Node’s synchronous ESM support and requires Node 22.12 or newer on the 22
line, or Node 23 and newer. A browser DOM is required to attach a field. Importing
the module alone is safe in Node or during server-side rendering.

## Repository layout

- `src/index.ts` exposes the browser SDK.
- `src/browser/` contains field handling, spelling hints, and caret positioning.
- `src/engine/` contains ranking rules, model data, and data attribution.
- `scripts/build-native-lexicon.py` regenerates the bundled dictionary module.

## Release check

Run `npm ci`, then `npm run typecheck` and `npm pack --dry-run`. Packing
builds the JavaScript and TypeScript declarations into `dist/`. Build a test tarball with
`npm pack`, install it in a separate project, and verify the package export and
browser input before publishing.
