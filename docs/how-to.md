# How-to guides

Each guide assumes `inflectionts` and `effect` are installed (see the [README](../README.md#install)) and shows a complete program you can run with `bun`. New to the library? Start with the [tutorial](tutorial.md).

- [Label a count with any noun](#label-a-count-with-any-noun)
- [Put "a" or "an" before a word](#put-a-or-an-before-a-word)
- [Turn numbers into ordinals and words](#turn-numbers-into-ordinals-and-words)
- [Turn a plural name back into a singular](#turn-a-plural-name-back-into-a-singular)
- [Write an amount in words for a check](#write-an-amount-in-words-for-a-check)
- [Let other people write count-aware templates](#let-other-people-write-count-aware-templates)
- [Use Latin and Greek plurals](#use-latin-and-greek-plurals)
- [Teach it a word it gets wrong](#teach-it-a-word-it-gets-wrong)
- [Handle invalid input](#handle-invalid-input)
- [Call it from code that doesn't use Effect](#call-it-from-code-that-doesnt-use-effect)

## Label a count with any noun

`no(word, count)` prefixes the count and inflects the word to match. A count of 0 becomes "no". Capitalization follows the input.

```ts
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { Inflector, no } from "inflectionts"

const program = Effect.gen(function* () {
  for (const [name, count] of [
    ["Person", 3],
    ["Cactus", 1],
    ["Mouse", 0]
  ] as const) {
    yield* Console.log(yield* no(name, count))
  }
})

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

```output
3 People
1 Cactus
no Mice
```

To get only the word without the count, use `plural(word, count)`.

Pass the **singular** form. Like Python's inflect, the plural functions assume their input is singular. An already-plural word gets a second ending from `pluralNoun`, and `plural` may read it as a verb instead:

```ts
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { Inflector, plural, pluralNoun } from "inflectionts"

const program = Effect.gen(function* () {
  yield* Console.log(yield* pluralNoun("cats"))
  yield* Console.log(yield* pluralNoun("people"))
  yield* Console.log(yield* plural("cats"))
})

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

```output
catss
peoples
cat
```

Running input through `singularNoun` first is not a safe fix: it also changes words that are already singular, such as "analysis" to "analysi" and "bus" to "bu". Store the singular name when users create a collection, or ask for it.

## Put "a" or "an" before a word

`a` (also exported as `an`) chooses by pronunciation, including silent "h", "u" pronounced "you", and abbreviations read letter by letter.

```ts
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { a, Inflector } from "inflectionts"

const program = Effect.gen(function* () {
  for (const word of ["hour-long call", "unicorn sticker", "FBI agent", "European tour"]) {
    yield* Console.log(yield* a(word))
  }
})

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

```output
an hour-long call
a unicorn sticker
an FBI agent
a European tour
```

Acronyms read as words follow the first sound of the word, so `a("FAQ")` gives "a FAQ" (as in "fack"). If you say it letter by letter, register it with `defan("FAQ")`; see [Teach it a word it gets wrong](#teach-it-a-word-it-gets-wrong).

## Turn numbers into ordinals and words

`ordinal` keeps the input's form: a number gives "21st", a number word gives "twenty-first". To get the ordinal word from a number, spell the number out first.

```ts
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { Inflector, numberToWords, ordinal } from "inflectionts"

const program = Effect.gen(function* () {
  yield* Console.log(yield* ordinal(21))
  yield* Console.log(yield* ordinal(yield* numberToWords(21)))
  yield* Console.log(yield* numberToWords(1234))
  yield* Console.log(yield* numberToWords(1234, { andword: "" }))
})

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

```output
21st
twenty-first
one thousand, two hundred and thirty-four
one thousand, two hundred thirty-four
```

`numberToWords` includes "and" by default (British style); pass `{ andword: "" }` to drop it.

## Turn a plural name back into a singular

`singularNoun` returns an `Option`: `Some` with the singular, or `None` when the word is already singular.

```ts
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { Inflector, singularNoun } from "inflectionts"

const modelName = (table: string) =>
  singularNoun(table).pipe(Effect.map(Option.getOrElse(() => table)))

const program = Effect.gen(function* () {
  for (const table of ["categories", "people", "analyses", "user"]) {
    yield* Console.log(yield* modelName(table))
  }
})

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

```output
category
person
analysis
user
```

## Write an amount in words for a check

`numberToCurrency` rounds cents half up and writes them as `XX/100`.

```ts
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { Inflector, numberToCurrency } from "inflectionts"

const program = Effect.gen(function* () {
  yield* Console.log(yield* numberToCurrency(1234.56, { andword: "" }))
  yield* Console.log(yield* numberToCurrency(2.675))
})

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

```output
one thousand, two hundred thirty-four and 56/100
two and 68/100
```

## Let other people write count-aware templates

`inflect` evaluates calls such as `plural('word')`, `no('word', n)`, `a('word')`, `ordinal(n)`, and `num(n)` inside a string. `num(n)` prints `n` and sets the count for the calls after it in the same template.

```ts
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { inflect, Inflector } from "inflectionts"

const template = "You have num(%d) plural('new message') from plural('child')"

const program = Effect.gen(function* () {
  yield* Console.log(yield* inflect(template.replace("%d", "3")))
  yield* Console.log(yield* inflect(template.replace("%d", "1")))
})

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

```output
You have 3 new messages from children
You have 1 new message from child
```

A template with a syntax error or an unknown function fails with `InflectTemplateError`. Templates are parsed, not evaluated as JavaScript.

## Use Latin and Greek plurals

By default plurals follow modern English ("cactuses", "formulas"). `classical` switches modes on for the current `Inflector`.

```ts
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { classical, Inflector, pluralNoun } from "inflectionts"

const program = Effect.gen(function* () {
  yield* Console.log(yield* pluralNoun("cactus"))
  yield* classical({ ancient: true })
  yield* Console.log(yield* pluralNoun("cactus"))
  yield* Console.log(yield* pluralNoun("formula"))
})

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

```output
cactuses
cacti
formulae
```

Other modes: `herd` ("wildebeest" stays "wildebeest"), `persons` ("person" becomes "persons"), `zero` ("0 error"), `names`, and `all`.

## Teach it a word it gets wrong

`defnoun`, `defverb`, `defadj`, `defa`, and `defan` add rules that take priority over the built-in ones. Pass `{ case: "preserve" }` to `defnoun` to keep the plural's capitalization exactly as you wrote it.

```ts
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { a, defan, defnoun, Inflector, pluralNoun } from "inflectionts"

const program = Effect.gen(function* () {
  yield* defnoun("pokémon", "pokémon")
  yield* defnoun("VAX", "VAXen", { case: "preserve" })
  yield* defan("FAQ")
  yield* Console.log(yield* pluralNoun("pokémon"))
  yield* Console.log(yield* pluralNoun("VAX"))
  yield* Console.log(yield* a("FAQ"))
})

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

```output
pokémon
VAXen
an FAQ
```

Rules live in the `Inflector` you provided, so they don't leak into other programs. To start every program with the same rules, build the state once with `applyDefNoun` and friends and provide `Inflector.layerWith(state)`.

## Handle invalid input

Errors are typed values in the `Effect` error channel. An empty word fails with `InvalidWordError`; an unknown gender fails with `BadGenderError`. Recover with `Effect.catchTag`.

```ts
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { Inflector, plural } from "inflectionts"

const program = plural("").pipe(
  Effect.catchTag("InvalidWordError", (error) => Effect.succeed(`rejected: ${error._tag}`)),
  Effect.flatMap(Console.log)
)

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

```output
rejected: InvalidWordError
```

## Call it from code that doesn't use Effect

Create one `ManagedRuntime` for the lifetime of your app and run operations through it. It returns plain values.

```ts
import * as ManagedRuntime from "effect/ManagedRuntime"
import { Inflector, plural } from "inflectionts"

const inflector = ManagedRuntime.make(Inflector.layer)

console.log(inflector.runSync(plural("person", 2)))

await inflector.dispose()
```

```output
people
```

The runtime keeps one `Inflector`, so rules added with `defnoun` stay in effect for later calls. If the project doesn't use Effect anywhere else, a smaller library such as `pluralize` is probably a better fit.
