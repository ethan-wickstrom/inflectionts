# inflectionts

Effect v4 port of Python's inflect: English plurals, singulars, `a`/`an`, ordinals, number words, and templates. Bun workspace: the library is `packages/inflectionts`, the CLI is `apps/cli`. Human docs: `README.md`, `docs/`, `CONTRIBUTING.md`.

## Commands

Run from the repository root. The dev shell (`direnv allow` or `nix develop`) pins Bun 1.4.5; without it, `bun run check` stops with install instructions if Bun is not 1.4.5.

- `bun run check`: toolchain preflight, frozen install, formatting, `tsc -b`, type-aware lint, tests, then docs. It must pass before a commit; the pre-commit hook runs it.
- `bun run fix`: autofix lint, then format. Run it before `check`.
- `bun test <path>` or `bun test -t <name>`: tests run against `src/`, no build needed.
- `bun run docs`: runs every `@example` in `src/*.ts` (docgen) and every `ts` block in `README.md` and `docs/` (`scripts/check-docs.ts`). A `ts` block followed by an `output` block must print exactly that.
- `nix flake check`: the same gates in a sandbox, plus the packed-tarball consumer test. Run it after changing `flake.nix`, `nix/`, or dependencies.

## Where things are

- `packages/inflectionts/src/Inflector.ts`: the `Inflector` service, its layers, and every public operation, each with a JSDoc `@example`.
- `src/Schema.ts` (types, state, options), `src/Errors.ts` (tagged errors), `src/internal/` (rules; not exported).
- `src/internal/data.ts`: word lists copied from inflect; the header comment explains the names.
- `test/upstream/`: inflect's test suite, ported; `PARITY.md` lists every upstream test and each deliberate difference. Keep it current when behavior changes.
- `scripts/pack.ts`: the only correct way to build the npm tarball.
- `repos/effect`: Effect 4.1.4 source, read-only. Look up APIs in `repos/effect/LLMS.md` and `repos/effect/packages/effect/src/`. Never edit or import it.

## Rules the checks don't catch

- When behavior changes, update the `@example`, the docs blocks, and `PARITY.md` in the same commit. Keep README claims checkable: a test or a running block must back each one.
- Never `npm publish` or `bun pm pack` inside `packages/inflectionts`: they ship the development `exports` (`./src/*.ts`). Use `bun scripts/pack.ts <dir>` and publish that tarball.
- After changing any `package.json` dependency, run `bun install` and `nix run .#lock`, and commit `bun.lock` with `nix/bun-cache-hashes.nix`.
- Shared versions live in the root `catalog`; packages reference them as `"catalog:"`. Every imported package must be declared in the package that imports it (isolated linker).
- Scripts under `packages/*/scripts` are Effect programs on `BunServices.layer` with `effect/cli` and `BunRuntime.runMain`; print with `Console`.
- Do not use `as`, `any`, or hand-written type guards (use `effect/Predicate`). Lint rejects most of these.

## Effect v4, not v3

Models often write v3 APIs; these differ in 4.1.4:

- Services: `class X extends Context.Service<X, Shape>()("pkg/X") { static readonly layer = Layer.effect(X, make) }`. No `Context.Tag`, `Effect.Tag`, `Effect.Service`.
- Errors: `class E extends Schema.TaggedError<E, { readonly brand: unique symbol }>()("E", { ...fields })`; fail with `return yield* new E(...)`.
- Recovery: `Effect.catch`, `Effect.catchTag`, `Effect.catchCause`. No `catchAll`.
- Functions: `Effect.fnUntraced(function* (...) {...})` for library operations, `Effect.fn("Name")` for traced ones; pass combinators as trailing arguments.
- `Either` is `Result`; `Option`, `Ref`, and `Fiber` are not Effects (use `Effect.fromOption`, `Ref.get`, `Fiber.join`).
- Schema: `Schema.Union([...])`, `Schema.Literals([...])`, `Schema.decodeUnknownEffect`.
- Imports use subpaths: `effect/Effect`, `effect/Schema`, `effect/cli`, `effect/process`, `effect/testing`.
