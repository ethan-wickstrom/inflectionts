# Cold-start rerun (commit 823ddf3, 2026-11-21)

Thread: T-01a1fb74-47ad-7530-a12f-1b78243218fb, a fresh orb with no access to this repository's
other threads or `evals/results/`. Score: 11/12, the same as the [baseline](baseline-cold-start.md).
U1 still fails because the package is not on npm.

| Task | Baseline | Rerun | Remaining friction                                                                             |
| ---- | -------- | ----- | ---------------------------------------------------------------------------------------------- |
| U1   | FAIL     | FAIL  | not on npm (404). The README now states this and gives the from-clone tarball steps            |
| U2   | 2m13s    | 0m46s | `cactuses` vs `cacti`: the default is documented, but the task doesn't say which form it wants |
| U3   | 2m25s    | 0m46s | `a FAQ` is now explained in how-to and explanation; still a judgment call                      |
| U4   | 2m25s    | 0m46s | none                                                                                           |
| U5   | 2m25s    | 0m46s | none                                                                                           |
| C1   | 0m51s    | 1m07s | none (orb already had `node_modules`)                                                          |
| C2   | 1m02s    | 1m12s | none                                                                                           |
| C3   | 3m38s    | 1m56s | AGENTS.md told it to update PARITY.md on any behavior change (now scoped to upstream tests)    |
| C4   | 1m54s    | 2m02s | none: `bun scripts/pack.ts` (CONTRIBUTING "Release") on the first try                          |
| A1   | 4m18s    | 2m12s | none                                                                                           |
| A2   | 4m33s    | 2m12s | ran from the package directory; the task now states the scope                                  |
| A3   | 4m41s    | 2m30s | none                                                                                           |

Total time to last task: 4m41s in the baseline, 2m30s in the rerun. The user tasks (U2 to U5)
went from about 2m20s each to 46s, because the README example now shows how to run an Effect and
`docs/how-to.md` covers each task with a runnable program. Contributor tasks were already fast
and stayed about the same.

The baseline's friction entries and what changed:

- No install section, unpublished package: README "Install", plus a "Not on npm yet" route that
  was run in a clean shell from a fresh clone. Publishing is still blocked on an npm token.
- README never ran the Effect: every README and docs example ends with `Effect.runSync` and has an
  `output` block that CI compares.
- `effect` peer not stated: README "Install".
- `ordinal` accepting words, 1 -> "first", default "and": how-to "Turn numbers into ordinals and words".
- Uncommented word lists in `data.ts`: naming-key header (C3 dropped from 3m38s to 1m56s).
- `bun pm pack` ships broken exports: `packages/inflectionts/scripts/pack.ts`, documented in
  CONTRIBUTING "Release" (C4 first try).
- A2 ambiguity: `evals/cold-start/TASKS.md` now names the scope and Bun's `-t` matching.
