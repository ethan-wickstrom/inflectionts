<p align="center"><img src="https://raw.githubusercontent.com/ethan-wickstrom/inflectionts/main/assets/logo.svg" width="96" height="96" alt=""></p>

<h1 align="center">inflectionts</h1>

<p align="center">
  <a href="https://github.com/ethan-wickstrom/inflectionts/actions/workflows/check.yml"><img src="https://github.com/ethan-wickstrom/inflectionts/actions/workflows/check.yml/badge.svg" alt="check status"></a>
  <a href="https://github.com/ethan-wickstrom/inflectionts/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ethan-wickstrom/inflectionts" alt="MIT license"></a>
</p>

English inflection for [Effect v4](https://effect.website) programs: plurals, singulars, `a`/`an`, ordinals, number words, and count-aware templates for words you don't know in advance. A TypeScript port of Python's [inflect](https://github.com/jaraco/inflect).

```ts
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { a, Inflector, no, numberToWords, ordinal, singularNoun } from "inflectionts"

const program = Effect.gen(function* () {
  yield* Console.log(yield* no("Person", 3))
  yield* Console.log(yield* no("Cactus", 1))
  yield* Console.log(yield* a("hour-long call"))
  yield* Console.log(yield* ordinal(yield* numberToWords(21)))
  yield* Console.log(Option.getOrUndefined(yield* singularNoun("analyses")))
})

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

```output
3 People
1 Cactus
an hour-long call
twenty-first
analysis
```

## Install

```sh
bun add inflectionts effect   # or: npm install inflectionts effect
```

`effect` (^4.1.4) is a peer dependency. The package is ESM-only and has no other runtime dependencies.

## When to use it, and when not to

Use inflectionts when an Effect v4 program has to inflect **words it doesn't know in advance**: user-named collections, rule names, model names, product names, or templates written by someone else.

Don't use it when:

- **The words are fixed.** "1 comment / 5 comments" needs only `Intl.PluralRules` and the two forms written by hand. That also works for other languages; inflectionts is English only.
- **The project doesn't use Effect.** Every operation returns an `Effect` and needs the `Inflector` layer. [`pluralize`](https://www.npmjs.com/package/pluralize) is smaller and returns plain strings.
- **You need another language.** Only English is supported.

## Documentation

- [Tutorial](https://github.com/ethan-wickstrom/inflectionts/blob/main/docs/tutorial.md): write your first program, from install to a sentence that reads naturally.
- [How-to guides](https://github.com/ethan-wickstrom/inflectionts/blob/main/docs/how-to.md): label counts, pick `a` or `an`, ordinals, singular names, money in words, templates, custom words, errors, and calling from non-Effect code.
- [Explanation](https://github.com/ethan-wickstrom/inflectionts/blob/main/docs/explanation.md): why it's an Effect service, how state is isolated, modern versus classical plurals, and how it relates to Python's inflect.
- API reference: every export is documented in [`src/Inflector.ts`](https://github.com/ethan-wickstrom/inflectionts/blob/main/packages/inflectionts/src/Inflector.ts), [`src/Schema.ts`](https://github.com/ethan-wickstrom/inflectionts/blob/main/packages/inflectionts/src/Schema.ts), and [`src/Errors.ts`](https://github.com/ethan-wickstrom/inflectionts/blob/main/packages/inflectionts/src/Errors.ts), with an example that runs in CI. `bun run docs` renders it to Markdown.
- [Contributing](https://github.com/ethan-wickstrom/inflectionts/blob/main/CONTRIBUTING.md): set up, test, change word lists, and release.

There is also a command-line tool in [`apps/cli`](https://github.com/ethan-wickstrom/inflectionts/tree/main/apps/cli): `nix run github:ethan-wickstrom/inflectionts -- plural person`.

## Compatibility with Python's inflect

The test suite ports all 103 of inflect's test functions that apply to TypeScript; [`PARITY.md`](https://github.com/ethan-wickstrom/inflectionts/blob/main/packages/inflectionts/test/upstream/PARITY.md) lists each one and the 19 places where behavior differs on purpose, such as typed errors instead of exceptions.

## License

MIT. Rules, word lists, and test fixtures are ported from inflect, © 2010 Paul Dyson. See [LICENSE](https://github.com/ethan-wickstrom/inflectionts/blob/main/LICENSE).
