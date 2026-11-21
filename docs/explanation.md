# About inflectionts

This page explains why the library works the way it does. For tasks, see the [how-to guides](how-to.md).

## About the Effect service

Inflection looks like a pure function, but it isn't quite: Python's inflect keeps settings and custom rules on an engine object, and `classical`, `gender`, `num`, and `defnoun` change what later calls return. A module-level singleton would let one part of an app change plurals for every other part, and would make tests depend on their order.

inflectionts puts that state behind an Effect service, `Inflector`. Each time you provide `Inflector.layer`, Effect builds a new service with its own state. Two programs that provide the layer separately never see each other's rules:

```ts
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { defnoun, Inflector, pluralNoun } from "inflectionts"

const withRule = Effect.gen(function* () {
  yield* defnoun("octopus", "octopodes")
  return yield* pluralNoun("octopus")
})

const program = Effect.gen(function* () {
  yield* Console.log(yield* withRule.pipe(Effect.provide(Inflector.layer)))
  yield* Console.log(yield* pluralNoun("octopus").pipe(Effect.provide(Inflector.layer)))
})

Effect.runSync(program)
```

```output
octopodes
octopuses
```

Every operation therefore has the type `Effect<A, E, Inflector>`: `A` is the result (a string for most operations, an `Option` for `singularNoun`), `E` lists the typed errors it can fail with. The `Inflector` in the third position is the requirement; the program can't run until a layer supplies it. Provide it once at the edge of your application, not around each call, so settings you change apply to the rest of that program.

## About errors

Invalid input, such as an empty word, an unknown classical mode, or a malformed template, is an expected failure, not a bug. Each one is a `Schema.TaggedError` class in `inflectionts/Errors` with a `_tag`, so the error type of every operation lists exactly what can go wrong and `Effect.catchTag` can handle each case. Inputs the library accepts are never thrown as exceptions.

## About pure state functions

`applyClassical`, `applyGender`, `applyNum`, `applyDefNoun`, `applyDefVerb`, `applyDefAdj`, and `applyDefArticle` take an `InflectorState` and return a new one without touching any service. They exist because a starting configuration is data: building it needs no running `Inflector`, so it can be made once and shared by every program ([how-to](how-to.md#start-every-program-with-the-same-rules)). Each accepts the state first (`applyGender(state, "feminine")`) or last (`applyGender("feminine")(state)`) for use in pipelines.

## About modern and classical plurals

English has two plurals for many borrowed words: "cactuses" and "cacti", "formulas" and "formulae". inflectionts follows inflect and defaults to the modern, anglicized form, because that is what most current writing uses. `classical({ ancient: true })` switches to the Latin and Greek forms, and the other modes cover herd animals ("wildebeest"), "persons", zero counts, and proper names.

## About articles

`a` chooses by sound, not spelling, using inflect's rules for silent "h", "eu" and "u" pronounced "you", single letters, and abbreviations. Abbreviations are the ambiguous case: "FBI" is read letter by letter ("an FBI agent"), but a pronounceable acronym such as "FAQ" or "NASA" is read as a word ("a FAQ"). When your readers say it differently, `defa` and `defan` override the choice.

## About the relationship to Python's inflect

inflectionts is a port of [jaraco/inflect](https://github.com/jaraco/inflect): the rules and word lists in `src/internal/data.ts` are copied from it, and `test/upstream/` ports its test suite. [`PARITY.md`](../packages/inflectionts/test/upstream/PARITY.md) maps all 103 upstream test functions: 86 run here (43 ported directly, 43 covered by existing tests), and 17 test Python-only helpers or type checks. It also lists the 19 deliberate differences, nearly all of which replace a Python exception with a typed Effect error.

What the port changes is the interface: an Effect service instead of a mutable engine, typed errors instead of exceptions, `Option` instead of `False` from `singularNoun`, and a template parser instead of Python's `eval` for `inflect`.
