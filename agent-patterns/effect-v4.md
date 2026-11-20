# Effect v4 Patterns (`effect@4.1.4`)

Reference idioms extracted from the vendored Effect source at `repos/effect/` (`effect@4.1.4`, commit `289a53f7b1fc40049219c6e69022db2fb859c356`). Always verify unfamiliar APIs against `repos/effect/LLMS.md`, `repos/effect/packages/effect/SCHEMA.md`, and `repos/effect/packages/effect/src/`.

## Effects & Control Flow

- Use `Effect.gen(function*() { ... })` for inline Effect values; never wrap and immediately invoke `Effect.fn` as an IIFE.
- Use `Effect.fn("Name")(function*(...) { ... })` for operations that need a tracing boundary.
- Use `Effect.fnUntraced(function*(...) { ... })` for reusable library functions and hot paths where tracing spans are not useful.
- Always `return yield*` when yielding a typed failure so TypeScript narrows the subsequent branch.
- Attach combinators to `Effect.fn` / `Effect.fnUntraced` as trailing arguments rather than `.pipe(...)`.
- Use `Effect.catch`, `Effect.catchTag`, and `Effect.catchTags` (v4 replaces v3's `Effect.catchAll`).

```ts
import { Effect, Schema } from "effect"

export class InvalidInputError extends Schema.TaggedError<InvalidInputError>()("InvalidInputError", {
  input: Schema.String,
  message: Schema.String
}) {}

export const parsePositive = Effect.fnUntraced(function* (input: string): Effect.fn.Return<number, InvalidInputError> {
  const n = Number(input)
  if (!Number.isInteger(n) || n <= 0) {
    return yield* new InvalidInputError({ input, message: "Expected a positive integer" })
  }
  return n
})
```

## Schemas & Domain Models

- Define external boundaries and domain types with `Schema`. Derive TypeScript types via `typeof MySchema["Type"]` and `typeof MySchema["Encoded"]`.
- `Schema.Literals(["a", "b"])` and `Schema.Union([A, B])` take arrays in Effect v4.
- Add checks with `.check(...)`, e.g. `Schema.String.check(Schema.isMinLength(1))` or `Schema.NonEmptyString`.
- Add brands with `.pipe(Schema.brand("BrandName"))`.
- Model exclusive alternatives with `Schema.TaggedUnion({ TagA: { ... }, TagB: { ... } })` or `Schema.Union([Schema.TaggedStruct(...), ...])`.
- Model domain errors with `Schema.TaggedError<Self>()("TagName", { ... })`.
- Prefer `Schema.decodeUnknownEffect(schema)` inside Effect code and keep decoders constructed once at module scope.

```ts
import { Schema } from "effect"

export const Word = Schema.NonEmptyString.pipe(Schema.brand("Word"))
export type Word = (typeof Word)["Type"]

export const Gender = Schema.Literals([
  "feminine",
  "masculine",
  "neuter",
  "gender-neutral",
  "feminine or masculine",
  "masculine or feminine"
])
export type Gender = (typeof Gender)["Type"]

export const ComparisonResult = Schema.TaggedUnion({
  Equal: {},
  SingularPlural: {},
  PluralSingular: {},
  PluralPlural: {},
  NotEqual: {}
})
export type ComparisonResult = (typeof ComparisonResult)["Type"]
```

## Exhaustive Pattern Matching (`Match`)

- Handle tagged unions with `Match.value(x).pipe(Match.tagsExhaustive({ ... }))` or `Match.type<T>().pipe(Match.tagsExhaustive({ ... }))`.
- Use ordinary `if`/early returns for simple local guards rather than constructing an unnecessary matcher.

```ts
import { Match } from "effect"

const describeComparison = Match.type<ComparisonResult>().pipe(
  Match.tagsExhaustive({
    Equal: () => "eq",
    SingularPlural: () => "s:p",
    PluralSingular: () => "p:s",
    PluralPlural: () => "p:p",
    NotEqual: () => ""
  })
)
```

## Services & Layers

- Define services with `Context.Service<Self, Shape>()("pkg/path/Service")` and provide implementations with `Layer.succeed`, `Layer.sync`, `Layer.effect`, or `Layer.scoped`.
- Define configuration values with defaults using `Context.Reference<A>("pkg/Config", { defaultValue: () => ... })`.
- Compose dependent layers explicitly with `Layer.provide` / `Layer.provideMerge` (never rely on `Layer.merge` to satisfy dependencies between sibling layers).
- Access the service type with `MyService["Service"]`.

```ts
import { Context, Effect, Layer } from "effect"

export class Formatter extends Context.Service<
  Formatter,
  {
    readonly format: (value: string) => Effect.Effect<string>
  }
>()("inflectionts/Formatter") {
  static readonly layer = Layer.succeed(
    Formatter,
    Formatter.of({
      format: (value) => Effect.succeed(value.trim())
    })
  )
}
```

## Property Testing (`Arbitrary`)

- Use `Arbitrary.schema(schema)` and `Arbitrary.checkEffect(arbitrary, predicate, options)` inside tests.
- Inspect the returned `CheckResult`: accept ONLY `result._tag === "Passed"`. Fail the test on `"Falsified"`, `"Exhausted"`, or `"ReplayMismatch"`, formatting diagnostics with `Arbitrary.formatCheckFailure(result)`.

```ts
import { Arbitrary, Effect } from "effect"

const assertProperty = Effect.fnUntraced(function* <A, E, R>(
  arbitrary: Arbitrary.Arbitrary<A>,
  property: (value: A) => boolean | Effect.Effect<boolean | void, E, R>,
  options?: Arbitrary.CheckOptions
) {
  const result = yield* Arbitrary.checkEffect(arbitrary, property, options)
  if (result._tag !== "Passed") {
    return yield* Effect.die(new Error(Arbitrary.formatCheckFailure(result) ?? `Property failed: ${result._tag}`))
  }
})
```

## Avoid

- Do not use removed v3 APIs: `Effect.catchAll` (use `Effect.catch`), `Context.Tag` / `Context.GenericTag` (use `Context.Service`), `Schema.Literal("a", "b")` variadic form (use `Schema.Literals(["a", "b"])`), `Schema.Union(A, B)` variadic form (use `Schema.Union([A, B])`), `Effect.runSync` inside Effect generators, or `@effect/schema` / `@effect/match` separate packages.
- Do not write manual `isString`/`isRecord` guards when `Predicate` from `effect` provides them.
- Do not ignore `Arbitrary.checkEffect`'s return value.
- Do not import from `repos/effect/`; always import from `"effect"` or `"@effect/*"`.
