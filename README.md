# inflectionts

Effect v4 TypeScript port of [`jaraco/inflect`](https://github.com/jaraco/inflect) for English plurals, singular nouns, ordinals, indefinite articles (`a`/`an`), present participles, list joining, template interpolation, and number/currency words.

## Usage

Provide `Inflector.layer` (or `Inflector.layerWith(initialState)`) at your application boundary. Each layer provision owns an isolated `Ref<InflectorState>`, so classical flags, pronoun gender, persistent `num` counts, and user-defined rules never leak across concurrent programs or tests.

```ts
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import {
  a,
  applyClassical,
  applyDefNoun,
  applyGender,
  classical,
  compare,
  comparisonCode,
  defaultState,
  defnoun,
  inflect,
  Inflector,
  join,
  no,
  numberToCurrency,
  numberToWords,
  ordinal,
  pluralNoun,
  pluralVerb,
  singularNoun
} from "inflectionts"

const program = Effect.gen(function* () {
  const count = 243
  const sentence = `There ${yield* pluralVerb("was", count)} ${yield* numberToWords(count)} ${yield* pluralNoun("person", count)} by the door.`
  // "There were two hundred and forty-three people by the door."

  const singular = yield* singularNoun("people") // Option.some("person")
  const cmp = comparisonCode(yield* compare("index", "indices")) // "s:p"
  const article = yield* a("hour") // "an hour"
  const zero = yield* no("error", 0) // "no errors"
  const ord = yield* ordinal(21) // "21st"
  const check = yield* numberToCurrency(2.675) // "two and 68/100"
  const list = yield* join(["apple", "banana", "carrot"]) // "apple, banana, and carrot"
  const rendered = yield* inflect("I saw 3 plural('cat', 3)") // "I saw 3 cats"

  yield* classical({ ancient: true })
  const formulae = yield* pluralNoun("formula") // "formulae"

  yield* defnoun("URL", "URLs", { case: "preserve" })
  const urls = yield* pluralNoun("URL") // "URLs"

  return {
    sentence,
    singular: Option.getOrUndefined(singular),
    cmp,
    article,
    zero,
    ord,
    check,
    list,
    rendered,
    formulae,
    urls
  }
}).pipe(Effect.provide(Inflector.layer))

// Pure dual state combinators support both data-first and pipeline composition:
const customState = Effect.succeed(defaultState).pipe(
  Effect.flatMap(applyClassical({ ancient: true })),
  Effect.flatMap(applyGender("feminine")),
  Effect.flatMap(applyDefNoun("URL", "URLs", { case: "preserve" }))
)
```

## Public API

Package exports are exposed from `"inflectionts"` and subpath modules `"inflectionts/Inflector"`, `"inflectionts/Schema"`, and `"inflectionts/Errors"` (`./internal/*` is blocked).

### Service & Layers

- `Inflector`: `Context.Service<Inflector, InflectorService>()("inflectionts/Inflector")` (`TypeId = "~inflectionts/Inflector"`, `isInflectorService`)
- `Inflector.layer`: `Layer.Layer<Inflector>` with default state (`defaultState`)
- `Inflector.layerWith(initialState)`: `Layer.Layer<Inflector>` with custom `InflectorState` (`StateTypeId = "~inflectionts/InflectorState"`, `isInflectorState`)
- `makeInflector(initialState?)`: `Effect.Effect<InflectorService>`

### Inflection Operations (require `Inflector`)

- `plural(text, count?)`, `pluralNoun(text, count?)`, `pluralVerb(text, count?)`, `pluralAdj(text, count?)` -> `Effect<string, InvalidWordError, Inflector>`
- `singularNoun(text, count?, gender?)` -> `Effect<Option.Option<string>, InvalidWordError | BadGenderError, Inflector>`
- `compare(w1, w2)`, `compareNouns(w1, w2)`, `compareVerbs(w1, w2)`, `compareAdjs(w1, w2)` -> `Effect<ComparisonResult, InvalidWordError, Inflector>`
- `a(text, count?)` / `an(text, count?)` -> `Effect<string, InvalidWordError, Inflector>`
- `no(text, count?)` -> `Effect<string, InvalidWordError, Inflector>`
- `num(count?, show?)` -> `Effect<string, BadNumValueError, Inflector>`
- `presentParticiple(word)` -> `Effect<string, InvalidWordError, Inflector>`
- `ordinal(num)` -> `Effect<string, InvalidWordError | BadNumValueError, Inflector>`
- `numberToWords(num, options?)` -> `Effect<string, InvalidWordError | BadNumValueError | BadChunkingOptionError | NumOutOfRangeError, Inflector>`
- `numberToWordsList(num, options?)` -> `Effect<ReadonlyArray<string>, InvalidWordError | BadNumValueError | BadChunkingOptionError | NumOutOfRangeError, Inflector>`
- `numberToCurrency(num, options?)` -> `Effect<string, InvalidWordError | BadNumValueError | NumOutOfRangeError, Inflector>`
- `join(words, options?)` -> `Effect<string, InvalidWordError, Inflector>`
- `inflect(template)` -> `Effect<string, InvalidWordError | BadNumValueError | BadChunkingOptionError | NumOutOfRangeError | BadGenderError | InflectTemplateError, Inflector>`
- `classical(patch?)`, `gender(value)`, `defnoun(singular, plural, options?)`, `defverb(s1, p1, s2, p2, s3, p3)`, `defadj(singular, plural)`, `defa(pattern)`, `defan(pattern)`, `getState`

### Schemas, Errors & Pure Helpers

- Schemas: `Word`, `Gender`, `CaseMode`, `ClassicalMode`, `ClassicalConfig`, `ComparisonResult`, `ComparisonCode`, `NumberGroup`
- Errors (`Schema.TaggedError`): `InvalidWordError`, `UnknownClassicalModeError`, `BadNumValueError`, `BadChunkingOptionError`, `NumOutOfRangeError`, `BadUserDefinedPatternError`, `BadGenderError`, `InflectTemplateError`
- Pure helpers & dual state combinators: `comparisonCode(result)`, `enclose(s)`, `joinstem(cutpoint, words)`, `bysize(words)`, `partitionWord(text)`, `postprocess(orig, inflected, state)`, `udMatch(word, entries)`, `applyClassical`, `applyGender`, `applyNum`, `applyDefNoun`, `applyDefVerb`, `applyDefAdj`, `applyDefArticle`

## Toolchain & Verification

Host tools are managed by `flake.nix` (pinned `nixos-26.05` + pinned Bun `1.4.5`). Workspace dependencies are pinned in `package.json` catalog and `bun.lock` (`effect@4.1.4`, `typescript@7.0.2`, `oxlint@1.94.0`, `oxfmt@0.79.0`, `tsrs@7.1.0-beta.tsrs3`, `@effect/tsgo@0.73.2`).

```sh
nix develop -c bun run check      # format:check, typecheck (tsc 7.0.2), lint (effect-tsgo + tsrs), test
nix develop -c bun run build      # emit .d.ts via tsc + ESM bundle via bun build
nix run .#lock                    # regenerate bun.nix after changing bun.lock
nix fmt                           # format Nix files (excluding repos/)
nix flake check                   # run offline sandboxed build, check, and packed-consumer verification
```

### Vendored Reference Source

`repos/effect` is an unmodified, read-only Git subtree of `https://github.com/Effect-TS/effect.git` pinned at tag `effect@4.1.4` (`289a53f7b1fc40049219c6e69022db2fb859c356`), excluded from workspace discovery, TypeScript, Oxlint, Oxfmt, `bun test`, `nix fmt`, and Nix package builds.
