# Contributing

## Set up

The toolchain is pinned in `flake.nix` (Bun 1.4.5 and the language servers). With [Nix](https://nixos.org/download) and [direnv](https://direnv.net):

```sh
git clone https://github.com/ethan-wickstrom/inflectionts && cd inflectionts
direnv allow            # or: nix develop
bun install --frozen-lockfile
bun run check
```

Without Nix, install [Bun 1.4.5](https://bun.sh) and run the last two commands. Entering the dev shell also points `core.hooksPath` at `.githooks`, so every commit runs `bun run check` first; skip it once with `git commit --no-verify`.

## Layout

| Path                         | What it holds                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/inflectionts/src`  | The library. `Inflector.ts` (service and operations), `Schema.ts` (types and state), `Errors.ts` (typed errors), `internal/` (rules and word lists, not exported). |
| `packages/inflectionts/test` | Tests. `upstream/` ports Python inflect's tests; `PARITY.md` maps each one.                                                                                        |
| `apps/cli`                   | The `inflect` command-line tool.                                                                                                                                   |
| `docs/`                      | Tutorial, how-to guides, and explanation.                                                                                                                          |
| `evals/`                     | Adoption and cold-start evaluations for the docs.                                                                                                                  |
| `repos/effect`               | Read-only copy of Effect 4.1.4's source, for reference. Never edit or import it.                                                                                   |

## Everyday commands

```sh
bun test                                    # all tests, against src/ (no build needed)
bun test packages/inflectionts/test/numbers.test.ts
bun test -t ordinal                         # tests whose full name contains "ordinal"
bun run apps/cli/src/bin.ts plural person   # the CLI from source
bun run fix                                 # autofix lint, then format
bun run check                               # everything the pre-commit hook and Nix check
```

`bun run check` runs, in order: formatting, type checking, lint, tests, and `docs`. The `docs` step runs every `@example` in the API JSDoc with `@effect/docgen` and every `ts` code block in `README.md` and `docs/`; a block followed by an `output` block must print exactly that. If you change behavior, the docs that describe it fail until you update them.

## Change a word list

Rules and word lists are in `packages/inflectionts/src/internal/data.ts`, copied from Python inflect. The comment at the top of that file explains the naming scheme. For example, to make a noun plural to itself, add it in lowercase to `pl_sb_uninflected_complete`. Add a test for the word in `packages/inflectionts/test/plurals.test.ts`.

## Add or update a dependency

Edit the root `catalog` in `package.json` and refer to it as `"catalog:"` in the package that imports it. Then:

```sh
bun install
nix run .#lock    # updates nix/bun-cache-hashes.nix; commit it with bun.lock
```

## Release

```sh
cd packages/inflectionts
bun scripts/pack.ts /tmp/release      # builds and prints the tarball path
npm publish /tmp/release/inflectionts-<version>.tgz
```

Publish the tarball from `scripts/pack.ts`, never the package directory: `bun pm pack` and `npm publish` in `packages/inflectionts` would ship the development `exports`, which point at `src/`.

## Editors

The dev shell puts `effect-tsgo-lsp`, `oxlint-lsp`, `oxfmt-lsp`, `nixd`, and `nixfmt` on `PATH`. VS Code picks them up through `.vscode/settings.json`; install the recommended extensions and accept the workspace TypeScript version when asked.
