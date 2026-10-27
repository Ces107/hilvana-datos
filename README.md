# hilvana-datos

Datos de palabras del juego **Hilvana** (https://ces107.github.io/hilvana/), un juego de palabras en
español. Este repositorio publica la forma fuente de los archivos de datos que el juego distribuye bajo la
**Mozilla Public License 2.0**, tal como exige esa licencia. El resto del juego no está aquí y no está
sujeto a la MPL.

## Contenido

| Archivo | Qué es |
|---|---|
| `src/data/words.js` | Lista de palabras aceptadas: comunes (por frecuencia) y extra |
| `src/data/levels.js` | Los 600 niveles fijos del crucigrama |
| `src/data/daily.js` | Calendario de la palabra del día (760 días desde el 01-11-2026) |
| `tools/build_dict.py` | Genera `words.js` y `daily.js` |
| `tools/blocklist.txt` | Palabras excluidas (`[hard]`) o solo aceptadas como extra (`[soft]`) |
| `tools/gen_levels.js` | Genera `levels.js` |
| `src/game/text.js`, `layout.js`, `levels.js` | Módulos que usa `gen_levels.js` |
| `tools/dict_stats.json` | Estadísticas de la última generación |
| `DATA_LICENSES.md` | Análisis de licencias de las fuentes |
| `LICENSE` | Texto completo de la MPL-2.0 |

Los tres archivos de `src/data/` son idénticos byte a byte a los de la versión 0.3.0 del juego.

## Fuentes y licencias

- **Diccionarios ortográficos RLA-ES v2.9** (Santiago Bosio y colaboradores, https://github.com/sbosio/rla-es),
  tal como se distribuyen en LibreOffice (https://github.com/LibreOffice/dictionaries/tree/master/es).
  Triple licencia GPL-3.0+ / LGPL-3.0+ / MPL-1.1+; aquí se usan bajo **MPL-2.0** (opción «o posterior»).
- **Google Books Ngram Viewer**, unigramas en español v3 (20200217), años ≥ 1980
  (http://books.google.com/ngrams): **CC BY 3.0**. Solo recuentos de frecuencia.
- **Tatoeba**, frases en español (https://tatoeba.org): **CC BY 2.0 FR**. Solo recuentos de frecuencia;
  no se incluye ninguna frase.

Todo el contenido de este repositorio se publica bajo la MPL-2.0 (ver `LICENSE`). Los datos de Ngram y
Tatoeba no se incluyen; los scripts los descargan.

## Regenerar

```
python tools/build_dict.py     # -> src/data/words.js, src/data/daily.js (descarga ~3,2 GB de Ngram a tools/.cache)
node tools/gen_levels.js       # -> src/data/levels.js
```

Python 3 y Node.js, sin dependencias externas. `gen_levels.js` reproduce `levels.js` byte a byte y
`build_dict.py` reproduce `words.js` byte a byte (con las mismas descargas). `daily.js` puede variar en
algunas tildes entre ejecuciones (orden de conjuntos de Python, `PYTHONHASHSEED`); el `daily.js` publicado
es el calendario fijo del juego.

## English

Word data for **Hilvana** (https://ces107.github.io/hilvana/), a Spanish word game. This repository holds
the Source Code Form of the game's MPL-2.0 data files (`src/data/words.js`, `levels.js`, `daily.js`,
byte-identical to game version 0.3.0) and the scripts that generate them. The word list derives from the
RLA-ES Spanish spelling dictionaries v2.9 (GPL-3.0+ / LGPL-3.0+ / MPL-1.1+, used here under MPL-2.0);
frequency ranking uses Google Books Ngram (CC BY 3.0) and Tatoeba (CC BY 2.0 FR) counts only. Everything
here is MPL-2.0; the rest of the game is not part of this repository.
