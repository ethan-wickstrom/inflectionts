# Cold-start tasks

Attempt these tasks using only this repository and the public internet. Do not read
`evals/cold-start/check.sh` until you have attempted every task.

Set these before you start:

```sh
export REPO="$(git rev-parse --show-toplevel)"   # this clone
export OUT=/tmp/cold-start                       # answers go here
export USERAPP=/tmp/cs-user                      # library-user project, outside the repo
mkdir -p "$OUT"
git -C "$REPO" rev-parse HEAD > "$OUT/start-sha"
```

Keep a friction log at `$OUT/friction.md`. Add an entry for every hesitation, guess, or
failure: the time, the task, the command, the relevant output, and what you were looking
for. Record the time you started and the time each task first passed.

## Library user

Work in `$USERAPP`, a new Bun project outside the repository, as someone who found the
package and wants to use it in their own app.

- **U1** Add the `@ethan-wickstrom/inflectionts` package to `$USERAPP` from the npm registry, the way a user would.
- **U2** Write `$USERAPP/plural.ts`. Running `bun plural.ts` prints the plural of `person`,
  `cactus`, `analysis`, `mouse`, and `sheep`, one per line, in that order.
- **U3** Write `$USERAPP/article.ts`. It prints `hour`, `unicorn`, `FAQ`, `apple`, and
  `European` with the right indefinite article (`a` or `an`) in front, one per line.
- **U4** Write `$USERAPP/numbers.ts`. It prints three lines: 1234 in English words, 21 as a
  numeric ordinal (`21st`), and the ordinal word for `twenty-one`.
- **U5** Write `$USERAPP/errors.ts`. It tries to pluralize the empty string, prints the
  `_tag` of the typed error it gets, and exits with status 0.

## Contributor

Work in `$REPO`.

- **C1** Get `bun run check` to pass from this fresh clone.
- **C2** Run the CLI from source (not a build) to pluralize `octopus`, and save its standard
  output to `$OUT/C2.txt`.
- **C3** Make the library leave `pokémon` and `Pokémon` unchanged when pluralized, add a test
  for it, and commit the change. The commit must go through the repository's pre-commit
  hook (do not use `--no-verify`).
- **C4** Produce the tarball that would be published to npm for the library package and
  write its absolute path to `$OUT/C4.txt`.

## Coding agent

Work in `$REPO` as a coding agent asked to do small tasks in this codebase.

- **A1** Add a test file `packages/inflectionts/test/ordinal-words.test.ts` that checks the
  library turns the numbers 1, 2, and 3 into the words `first`, `second`, and `third`.
- **A2** In `packages/inflectionts` only (not `apps/cli`), run the tests whose full name
  (`describe` titles plus the test title, as Bun's `-t` matches it) contains `ordinal`,
  including the test you added in A1. Write the number that passed to `$OUT/A2.txt`.
- **A3** Find the file in the vendored Effect source that defines `Context.Service`, and
  write its path relative to `$REPO` to `$OUT/A3.txt`.
