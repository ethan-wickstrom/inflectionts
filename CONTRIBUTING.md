# Contributing

## Set up

```sh
git clone https://github.com/ethan-wickstrom/inflectionts && cd inflectionts
bun run check
```

That one command checks the toolchain, installs dependencies from `bun.lock`, and runs every gate. It needs Bun 1.4.5 (the `packageManager` field in `package.json`); with any other version or no Bun, it stops and prints how to install the right one.

With [Nix](https://nixos.org/download/), `direnv allow` or `nix develop` gives you the pinned Bun and the editor language servers, and points `core.hooksPath` at `.githooks` so every commit runs `bun run check` first. Skip the hook once with `git commit --no-verify`.

## Layout

| Path                         | What it holds                                                                                                                                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/inflectionts/src`  | The library. `Inflector.ts` (service and operations), `Schema.ts` (types and state), `Errors.ts` (typed errors), `internal/` (rules and word lists; not exported, tests import it as `#internal/*`). |
| `packages/inflectionts/test` | Tests. `upstream/` ports Python inflect's tests; `PARITY.md` maps each one.                                                                                                                          |
| `apps/cli`                   | The `inflect` command-line tool.                                                                                                                                                                     |
| `docs/`                      | Tutorial, how-to guides, and explanation.                                                                                                                                                            |
| `evals/`                     | Adoption and cold-start evaluations for the docs.                                                                                                                                                    |
| `repos/effect`               | Read-only copy of Effect 4.1.4's source, for reference. Never edit or import it.                                                                                                                     |

## Everyday commands

```sh
bun test                                    # all tests, against src/ (no build needed)
bun test packages/inflectionts/test/numbers.test.ts
bun test -t ordinal                         # tests whose full name contains "ordinal"
bun run apps/cli/src/bin.ts plural person   # the CLI from source
bun run fix                                 # autofix lint, then format
bun run check                               # everything the pre-commit hook and Nix check
```

`bun run check` runs, in order: the toolchain preflight, `bun install --frozen-lockfile`, formatting, type checking, lint, tests, `docs`, and `links`. The `docs` step runs every `@example` in the API JSDoc with `@effect/docgen` and every `ts` code block in `README.md`, `docs/`, and `skills/inflectionts/SKILL.md`; a block followed by an `output` block must print exactly that. If you change behavior, the docs that describe it fail until you update them. The `links` step checks every relative link and every link to this repository on GitHub, including `#anchors`, offline; `bun run links:external` also fetches external links, and CI runs it after `check`.

Add a line under `## [Unreleased]` in `CHANGELOG.md` for every change a package user would notice.

## Change a word list

Rules and word lists are in `packages/inflectionts/src/internal/data.ts`, copied from Python inflect. The comment at the top of that file explains the naming scheme. For example, to make a noun plural to itself, add it in lowercase to `pl_sb_uninflected_complete`. Add a test for the word in `packages/inflectionts/test/plurals.test.ts`.

## Add or update a dependency

Edit the root `catalog` in `package.json` and refer to it as `"catalog:"` in the package that imports it. Then:

```sh
bun install
nix run .#lock    # updates nix/bun-cache-hashes.nix; commit it with bun.lock
```

## Release

Set `version` in `packages/inflectionts/package.json`, then in `CHANGELOG.md` rename `## [Unreleased]` to `## [<version>] - <date>`, add a new empty `## [Unreleased]` above it, and point the link definitions at the `v<version>` tag. After publishing, tag the commit `v<version>`.

```sh
cd packages/inflectionts
bun scripts/pack.ts /tmp/release      # builds and prints the tarball path
npm publish /tmp/release/inflectionts-<version>.tgz
```

Publish the tarball from `scripts/pack.ts`, never the package directory: `bun pm pack` and `npm publish` in `packages/inflectionts` would ship the development `exports`, which point at `src/`.

## Editors

The dev shell puts `effect-tsgo-lsp`, `oxlint-lsp`, `oxfmt-lsp`, `nixd`, and `nixfmt` on `PATH`. VS Code picks them up through `.vscode/settings.json`; install the recommended extensions and accept the workspace TypeScript version when asked.
