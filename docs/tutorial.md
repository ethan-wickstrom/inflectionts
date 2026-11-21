# Tutorial: write a summary sentence that reads naturally

In this tutorial you write a small Bun program that prints a summary like "There were two hundred and forty-three errors in 12 files" for any rule name and any count. It takes about ten minutes.

You need [Bun](https://bun.sh) 1.4 or later.

## 1. Create a project and install

```sh
mkdir summary && cd summary
bun init -y
bun add @ethan-wickstrom/inflectionts effect
```

## 2. Pluralize one word

Replace `index.ts` with:

```ts
import { Inflector, plural } from "@ethan-wickstrom/inflectionts"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"

const program = Effect.gen(function* () {
  yield* Console.log(yield* plural("error"))
})

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

Run it with `bun index.ts`:

```output
errors
```

Two things happened. `plural("error")` built an `Effect`, a description of work. `Effect.provide(Inflector.layer)` gave it the inflector it needs, and `Effect.runSync` ran it.

## 3. Let the count choose the form

Pass the count as the second argument. A count of 1 keeps the singular form:

```ts
import { Inflector, plural } from "@ethan-wickstrom/inflectionts"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"

const program = Effect.gen(function* () {
  yield* Console.log(yield* plural("error", 1))
  yield* Console.log(yield* plural("error", 243))
})

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

```output
error
errors
```

## 4. Build the sentence

The verb has to agree too, and the count reads better as words. Use `pluralVerb` and `numberToWords`:

```ts
import { Inflector, numberToWords, plural, pluralVerb } from "@ethan-wickstrom/inflectionts"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"

const summary = (rule: string, count: number, files: number) =>
  Effect.gen(function* () {
    const verb = yield* pluralVerb("was", count)
    const amount = yield* numberToWords(count)
    const noun = yield* plural(rule, count)
    return `There ${verb} ${amount} ${noun} in ${files} ${yield* plural("file", files)}`
  })

const program = Effect.gen(function* () {
  yield* Console.log(yield* summary("error", 243, 12))
  yield* Console.log(yield* summary("warning", 1, 1))
  yield* Console.log(yield* summary("analysis", 2, 3))
})

Effect.runSync(program.pipe(Effect.provide(Inflector.layer)))
```

```output
There were two hundred and forty-three errors in 12 files
There was one warning in 1 file
There were two analyses in 3 files
```

The last line shows why the library exists: "analysis" becomes "analyses", which appending an "s" gets wrong.

## What you built

A function that inflects any English noun and verb for any count. Next:

- [How-to guides](how-to.md) for articles, ordinals, singular names, templates, and custom words.
- [Explanation](explanation.md) for why every call returns an `Effect`.
