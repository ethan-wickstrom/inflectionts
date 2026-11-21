# Changelog

All notable changes to the `inflectionts` package. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Exports tagged `@stability stable` change
incompatibly only in a major version.

## [Unreleased]

## [0.1.0] - 2026-11-21

Published as `@ethan-wickstrom/inflectionts`; npm rejected the unscoped name as too similar to
`inflection`. First release: an Effect v4 port of Python's [inflect](https://github.com/jaraco/inflect) 7.6 (upstream commit 2084a52).

### Added

- `Inflector` service with `Inflector.layer` and `Inflector.layerWith(state)`; settings and custom
  rules belong to the provided layer.
- Plurals and singulars: `plural`, `pluralNoun`, `pluralVerb`, `pluralAdj`, `singularNoun`
  (returns `Option`), and `compare`, `compareNouns`, `compareVerbs`, `compareAdjs`.
- Articles and counts: `a`, `an`, `no`, `num`, and `presentParticiple`.
- Numbers: `ordinal` (numerals and number words), `numberToWords`, `numberToWordsList`, and
  `numberToCurrency` with half-up cent rounding.
- `join` for English lists and `inflect` for templates such as `"num(3) plural('child')"`.
- Settings and custom words: `classical`, `gender`, `defnoun`, `defverb`, `defadj`, `defa`,
  `defan`, and their pure `apply*` counterparts for building a starting state.
- Typed errors in `@ethan-wickstrom/inflectionts/Errors`, one `Schema.TaggedError` per failure, in place of
  inflect's exceptions. `PARITY.md` lists the 19 deliberate differences from inflect.

[Unreleased]: https://github.com/ethan-wickstrom/inflectionts/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ethan-wickstrom/inflectionts/releases/tag/v0.1.0
