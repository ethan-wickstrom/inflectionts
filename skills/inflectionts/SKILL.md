---
name: inflectionts
description: English inflection for Effect v4 TypeScript programs (plurals, singulars, a/an, ordinals, number words, check amounts, count-aware templates) for words not known in advance. Use when an Effect v4 project must inflect user-supplied or arbitrary English words. Do not use for fixed labels like "1 comment / 5 comments" (use Intl.PluralRules), in projects without Effect (use pluralize), or for languages other than English.
---

# inflectionts

## When to use it

Use it when all of these hold:

- The project uses Effect v4 (`effect` ^4.1.4). Check `package.json`.
- The words are not known in advance: user-named collections, model or table names, rule names, product names, or templates written by other people.
- The language is English.

Do not use it when:

- The text is a fixed count label with known words. Write both forms and pick one with `Intl.PluralRules`.
- The project does not use Effect, or uses Effect 3. Every operation returns an Effect v4 `Effect`; use `pluralize` instead.

## Install

```sh
bun add inflectionts effect   # or: npm install inflectionts effect
```

## Use it

Every operation needs the `Inflector` service. Provide `Inflector.layer` once at the edge of the program.

```ts
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import {
  a,
  Inflector,
  no,
  numberToWords,
  ordinal,
  plural,
  pluralVerb,
  singularNoun
} from "inflectionts"

const program = Effect.gen(function* () {
  yield* Console.log(yield* no("Person", 3))
  yield* Console.log(`There ${yield* pluralVerb("was", 1)} one ${yield* plural("warning", 1)}`)
  yield* Console.log(yield* a("hour-long call"))
  yield* Console.log(yield* ordinal(21))
  yield* Console.log(yield* ordinal(yield* numberToWords(21)))
  yield* Console.log(Option.getOrElse(yield* singularNoun("categories"), () => "categories"))
})

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

```output
3 People
There was one warning
an hour-long call
21st
twenty-first
category
```

## Operations

| Need                       | Call                                                            | Result                                        |
| -------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| Plural for a count         | `plural(word, count?)`, `pluralNoun`, `pluralVerb`, `pluralAdj` | `string`                                      |
| Count plus word, 0 as "no" | `no(word, count)`                                               | `"3 People"`, `"no errors"`                   |
| Singular                   | `singularNoun(word)`                                            | `Option<string>`; wrong on singular input     |
| Article                    | `a(word)` / `an(word)`                                          | `"an hour"`                                   |
| Ordinal                    | `ordinal(21)`, `ordinal("twenty-one")`                          | `"21st"`, `"twenty-first"`                    |
| Number in words            | `numberToWords(n, { andword?: "" })`                            | `"one thousand, two hundred and thirty-four"` |
| Check amount               | `numberToCurrency(n)`                                           | `"two and 68/100"`                            |
| List                       | `join(words, { conj?: "or" })`                                  | `"a, b, and c"`                               |
| Template                   | `inflect("num(3) plural('child')")`                             | `"3 children"`                                |
| Latin/Greek plurals        | `classical({ ancient: true })`                                  | `cactus` → `cacti`                            |
| Custom words               | `defnoun`, `defverb`, `defadj`, `defa`, `defan`                 |                                               |

## Constraints

- Defaults: modern plurals (`cactuses`), British "and" in number words, `a FAQ` (acronyms read as words). Change them with `classical`, `{ andword: "" }`, and `defan("FAQ")`.
- Pass singular words. `pluralNoun("cats")` gives `"catss"`, and `singularNoun` is not a safe normalizer (`"bus"` becomes `"bu"`), so store or ask for the singular form.
- Errors are typed: an empty word fails with `InvalidWordError`. Handle with `Effect.catchTag`.
- Settings and custom rules belong to one provided layer; they do not leak between programs. From non-Effect code, create one `ManagedRuntime.make(Inflector.layer)` and call `runSync`.

## Documentation

- README: https://github.com/ethan-wickstrom/inflectionts#readme
- How-to guides: https://github.com/ethan-wickstrom/inflectionts/blob/main/docs/how-to.md
- API (every operation has a tested example): https://github.com/ethan-wickstrom/inflectionts/blob/main/packages/inflectionts/src/Inflector.ts
