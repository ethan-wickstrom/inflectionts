# Effect v4 Patterns (`effect@4.1.4`)

Reference idioms extracted from the vendored Effect source at `repos/effect/` (`effect@4.1.4`, commit `289a53f7b1fc40049219c6e69022db2fb859c356`). Always verify unfamiliar APIs against `repos/effect/LLMS.md`, `repos/effect/packages/effect/SCHEMA.md`, and `repos/effect/packages/effect/src/`.

## Imports & Tree-Shaking

- Inside library source (`packages/*/src/**`), import Effect modules via explicit subpaths (`effect/Effect`, `effect/Schema`, `effect/Context`, `effect/Layer`, `effect/Match`, `effect/Option`, `effect/Predicate`, `effect/Ref`, `effect/Function`) rather than the root barrel `"effect"`.
- In tests, import `Arbitrary` from `"effect/Arbitrary"` and `TestClock` from `"effect/testing"`.

## Effects & Control Flow

- Use `Effect.gen(function* () { ... })` for inline Effect values; never wrap and immediately invoke `Effect.fn` as an IIFE.
- Use `Effect.fn("Name")(function* (...) { ... })` for operations that need a tracing boundary.
- Use `Effect.fnUntraced(function* (...) { ... })` for reusable library functions and hot paths where tracing spans are not useful.
- Always `return yield*` when yielding a typed failure so TypeScript narrows the subsequent branch.
- Attach combinators to `Effect.fn` / `Effect.fnUntraced` as trailing arguments rather than `.pipe(...)`.
- Use `Effect.catch`, `Effect.catchTag`, and `Effect.catchTags` (v4 replaces v3's `Effect.catchAll`).

```ts
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

export class InvalidInputError extends Schema.TaggedError<
  InvalidInputError,
  { readonly brand: unique symbol }
>()("InvalidInputError", {
  input: Schema.String,
  message: Schema.String
}) {}

export const parsePositive = Effect.fnUntraced(function* (
  input: string
): Effect.fn.Return<number, InvalidInputError> {
  const n = Number(input)
  if (!Number.isInteger(n) || n <= 0) {
    return yield* new InvalidInputError({ input, message: "Expected a positive integer" })
  }
  return n
})
```

## Schemas, Branding & Library Surface

- Define external boundaries and domain types with `Schema`. Derive TypeScript types via `(typeof MySchema)["Type"]` and `(typeof MySchema)["Encoded"]`.
- `Schema.Literals(["a", "b"])` and `Schema.Union([A, B])` take arrays in Effect v4.
- Add checks with `.check(...)`, e.g. `Schema.NonEmptyString` or `Schema.Finite`.
- Brand public domain types and services with a `~<package>/<Name>` `TypeId` literal and expose type guards with `Predicate.hasProperty`.
- Expose reusable combinators with `dual` from `"effect/Function"`.
- Tag public exports with `@stability` (`stable`, `unstable`, or `experimental`) and `@since` without leaking lower-stability types from stable signatures.
- Model domain errors with branded `Schema.TaggedError<Self, { readonly brand: unique symbol }>()("TagName", { ... })`.

```ts
import * as Match from "effect/Match"
import * as Schema from "effect/Schema"

export const Word = Schema.NonEmptyString.pipe(Schema.brand("Word"))
export type Word = (typeof Word)["Type"]

export const ComparisonResult = Schema.TaggedUnion({
  Equal: {},
  SingularPlural: {},
  PluralSingular: {},
  PluralPlural: {},
  NotEqual: {}
})
export type ComparisonResult = (typeof ComparisonResult)["Type"]

export const comparisonCode = Match.type<ComparisonResult>().pipe(
  Match.withReturnType<"eq" | "s:p" | "p:s" | "p:p" | undefined>(),
  Match.tagsExhaustive({
    Equal: () => "eq",
    SingularPlural: () => "s:p",
    PluralSingular: () => "p:s",
    PluralPlural: () => "p:p",
    NotEqual: () => undefined
  })
)
```

## Services & Layers

- Define services with `Context.Service<Self, Shape>()("pkg/path/Service")` and provide implementations with `Layer.effect`, `Layer.scoped`, `Layer.sync`, or `Layer.succeed`.
- Define configuration values with defaults using `Context.Reference<A>("pkg/Config", { defaultValue: () => ... })`.
- Compose dependent layers explicitly with `Layer.provide` / `Layer.provideMerge` (never rely on `Layer.mergeAll` to satisfy cross-layer requirements).
- Access the service type with `MyService["Service"]`.

## Property Testing (`effect/Arbitrary`)

- Use `Arbitrary.schema(schema)` and `Arbitrary.checkEffect(arbitrary, predicate, options)` inside tests.
- Give each evaluation a fresh isolated layer via `Layer.fresh(...)`.
- Inspect the returned `CheckResult`: accept ONLY `result._tag === "Passed"`. Fail the test on `"Falsified"`, `"Exhausted"`, or `"ReplayMismatch"`, formatting diagnostics with `Arbitrary.formatCheckFailure(result)`.

## Avoid

- Do not use removed v3 APIs: `Effect.catchAll` (use `Effect.catch`), `Context.Tag` / `Effect.Service` (use `Context.Service`), `Schema.Literal("a", "b")` variadic form (use `Schema.Literals(["a", "b"])`), `Schema.Union(A, B)` variadic form (use `Schema.Union([A, B])`), `Effect.runSync` inside Effect generators, or `@effect/schema` / `@effect/match` separate packages.
- Do not author `any`, `as`, or manual `typeof x === "string"` guards when `Predicate` from `"effect/Predicate"` provides them.
- Do not ignore `Arbitrary.checkEffect`'s return value.
- Do not import from `repos/effect/`; always import from declared package dependencies.
