# Data licences: Hilvana (game-palabras)

Research date: 2026-10-26. This is an engineering analysis, not legal advice. Get a lawyer's read before a
large launch.

**Constraint.** The app is closed-source and monetized (ads, in-app purchases). We cannot use a word source
whose licence would force the whole app open (strong copyleft on the program), forbid commercial use (NC),
or that is somebody's copyrighted database (RAE).

## Decision

| Role | Source | Licence | How we comply |
|---|---|---|---|
| **Which strings are Spanish words** (spelling, inflections) | **RLA-ES Spanish spelling dictionaries v2.9** (Santiago Bosio and contributors), as shipped in LibreOffice: https://github.com/LibreOffice/dictionaries/tree/master/es · upstream https://github.com/sbosio/rla-es | Tri-licensed, the user picks one: **GPL-3.0+ / LGPL-3.0+ / MPL-1.1+** (`README_hunspell_es.txt`, `LICENSE.md` in that folder) | We elect **MPL**, and through "1.1 or later" we use **MPL-2.0**. See below. |
| **How common a word is** (ranking only) | **Google Books Ngram Viewer**, Spanish 1-grams v3 (20200217), years ≥ 1980: https://storage.googleapis.com/books/ngrams/books/datasetsv3.html | **CC BY 3.0** ("This compilation is licensed under a Creative Commons Attribution 3.0 Unported License") | Attribution in the credits screen and `NOTICE.txt`. Only counts are used. No share-alike. |
| **How common a word is in everyday speech** (ranking only) | **Tatoeba** Spanish sentences: https://tatoeba.org/en/downloads (file `spa_sentences.tsv.bz2`) | **CC BY 2.0 FR** (part of the corpus is also CC0) | Attribution in credits and `NOTICE.txt`. Only word counts are used; no sentence is shipped. No share-alike. |
| Blocklist, level generator, layouts, daily order, regional vocabulary | Ours | Proprietary | n/a |
| "¿Cómo se dice?" regional data (`data/regional/regionalismos.json`) | Compiled by us from public sources (Wikipedia annex on vocabulary differences, Spanish Wikipedia articles, Academia Canaria de la Lengua, press articles; the full list with URLs is in the JSON's `sources`) | Facts of usage, written in our own words; no dictionary definitions or text copied | Source list kept in the data file; credits screen says so. 79 of 123 concepts are marked `uncertain` with notes. |

### Why MPL-2.0 works for a closed app

- MPL is **file-level copyleft**. Only files that contain MPL material ("Covered Software" and its
  "Modifications") must stay MPL. Our own code can sit next to them in a "Larger Work" under any licence
  (MPL-2.0 §3.3).
- The election is allowed: the RLA-ES README says "MPL versión 1.1 o posterior", and MPL-1.1 §6.2 lets a
  recipient use any later version published by Mozilla.
- The files in our app that contain dictionary-derived words are **`data/words.js`, `data/levels.js` and
  `data/daily.js`**. All three carry the MPL-2.0 header and attribution, and they are **separate files** in
  every build. `build.py` copies them as files and never concatenates them into `game.js`. It also checks
  the header is there.
- **Obligations we must meet** (MPL-2.0 §3.2, executable distribution):
  1. Tell recipients that these files are under MPL-2.0 and where to get their Source Code Form. This is
     done by the credits screen ("Créditos" → "Diccionario"), `NOTICE.txt` and `LICENSES/MPL-2.0.txt`
     shipped inside the build/APK.
  2. **Make the Source Code Form available.** **Done 2026-10-27:** public repo
     https://github.com/Ces107/hilvana-datos with the three data files (byte-identical to the 0.3.0 build),
     `tools/build_dict.py`, `tools/blocklist.txt`, `tools/gen_levels.js` + the three JS modules it needs
     (`text.js`, `layout.js`, `levels.js`), the MPL-2.0 text and this file. The URL is in the store listing
     (es/en) and in the credits text. The rest of the game stays private. Publishing the generator modules
     is optional (they are our code, not Modifications), but it makes the "preferred form for making
     modifications" argument trivial. When the data files change, push the new versions there too.
     Reproducibility (checked 2026-10-27 from the repo): `gen_levels.js` rebuilds `levels.js` byte for byte
     and `build_dict.py` rebuilds `words.js` byte for byte; `daily.js` can differ in a few accent choices
     between runs (Python set order, `PYTHONHASHSEED`), so the published `daily.js` is the frozen calendar.
  3. Keep the RLA-ES attribution and do not remove the licence notices.
- Why not GPL or LGPL: GPL-3 on a data file shipped inside an app invites the argument that the app is one
  combined work. LGPL-3 is written for libraries. MPL is the cleanest of the three for us.
- Is a word list even copyrightable? Single words are facts. The selection, and in the EU the sui generis
  database right, can still be protected. So we treat the list as protected and comply with MPL anyway.
  Compliance costs us nothing.

## Candidates considered and rejected

| Candidate | Licence / status | Why not (for a closed, monetized app) |
|---|---|---|
| RAE **DLE** (dle.rae.es) | © Real Academia Española, no open licence; site terms forbid systematic extraction | Not used, not scraped. The DLE also blocks scripted access (HTTP 403 seen during research). |
| RAE **CREA / CORPES frequency lists** (corpus.rae.es) | © RAE; no open licence found | Commercial reuse not granted, so excluded. |
| **hermitdave/FrequencyWords** (OpenSubtitles 2018 frequencies): https://github.com/hermitdave/FrequencyWords | "MIT License for code. CC-by-sa-4.0 for content" (README) | Share-alike on the data. Workable (separate file + attribution), but CC BY 3.0 Ngram + CC BY Tatoeba give the same ranking quality with **no** share-alike. |
| **wordfreq** (rspeer): https://github.com/rspeer/wordfreq | Code Apache-2.0; data "CC Attribution-ShareAlike 4.0" (README "License") | Same share-alike issue. The project is also sunset. |
| **Wiktionary / Wikcionario** dumps and lists derived from them | CC BY-SA 4.0 (+ GFDL for older text) | Share-alike on the data file. Also noisy (needs heavy cleaning), and full of proper nouns and archaisms. Kept as a plan C only. |
| **olea/lemarios** (Ismael Olea): https://github.com/olea/lemarios | README dedicates everything to the **public domain** | Attractive licence, but: (1) lemmas only, no inflected forms (no plurals, no conjugations); (2) the project's goal is to mirror the DRAE lemma list, and its provenance is not documented file by file. That leaves a database-right question with RAE that MPL-licensed RLA-ES does not have. **Plan B** if MPL ever becomes a problem: PD lemario + our own inflection rules. |
| Apertium / FreeLing Spanish dictionaries | GPL (Apertium), AGPL/GPL family (FreeLing) | Strong copyleft. |
| Leipzig Corpora Collection word lists | Non-commercial terms on the downloads page | NC is incompatible with ads and in-app purchases. |
| Scraped "diccionario-espanol-txt" style repos on GitHub | Usually scraped from the DLE | Copyright infringement risk; never use. |

## What the pipeline does with the data

See `tools/build_dict.py` (reproducible; downloads into `tools/.cache/`, which is gitignored):

1. Expands the 20 RLA-ES country dictionaries (es_ES + 19 Latin American) with their affix files. It uses
   lowercase entries only: capitalised entries are proper nouns and acronyms.
2. Keeps 3–8 letter forms with some frequency evidence (Ngram ≥ 50 occurrences since 1980, or seen in
   Tatoeba).
3. Ranks words by 60 % Tatoeba (everyday speech) + 40 % Ngram (books), on the Zipf scale.
4. Removes vulgar terms, slurs and insults (`tools/blocklist.txt`, `[hard]`: removed everywhere). It also
   removes abbreviations without a dot, Roman numerals and vowel-less strings.
5. **Common list** (level words, rank order). Excludes the `[soft]` list (accepted only as bonus words),
   names written mostly capitalised in books, verb + enclitic forms (déjalos), and vosotros/voseo forms
   (not shared by Spain and Mexico). It caps conjugated verb forms at the 5,000 most frequent.
6. **Daily list**: 5-letter noun/adjective lemmas (no verbs, no plurals), seen ≥ 5 times in Tatoeba. Shuffled
   with a fixed seed, 760 days (more than 2 years from 2026-11-01).
7. Normalisation for matching: lowercase, á é í ó ú ü → a e i o u u, **ñ stays a separate letter**.

Result (2026-10-26 build): **18,821 common words + 80,591 bonus-only words = 99,412 accepted words**;
760 daily answers; 600 frozen levels. Data files: words.js 435 KB, levels.js 60 KB, daily.js 7 KB,
regional.js 72 KB, about 575 KB in total (limit 1.5 MB).
