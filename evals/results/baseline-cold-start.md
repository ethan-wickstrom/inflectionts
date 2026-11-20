# Cold-start baseline (commit 2bd0f42, 2026-11-20)

Thread: T-01a1fb2d-23b8-740a-9590-cda285acd6b7. Score: 11/12 (U1 fails: package not on npm).

| Task | Result             | Time to first success | Friction                                                                                                                         |
| ---- | ------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| U1   | FAIL               | never                 | not on npm; README has no install section; path install fails on `catalog:` devDeps                                              |
| U2   | PASS (via tarball) | 2m13s                 | README never shows running the Effect (`runPromise`); `effect` peer install unstated; `cactuses` vs `cacti` default undocumented |
| U3   | PASS (via tarball) | 2m25s                 | `a FAQ` rule undocumented                                                                                                        |
| U4   | PASS (via tarball) | 2m25s                 | `ordinal` accepting words undocumented; default "and" in number words                                                            |
| U5   | PASS (via tarball) | 2m25s                 | none                                                                                                                             |
| C1   | PASS               | 0m51s                 | none                                                                                                                             |
| C2   | PASS               | 1m02s                 | none                                                                                                                             |
| C3   | PASS               | 3m38s                 | uncommented, duplicated word lists in `src/internal/data.ts`                                                                     |
| C4   | PASS               | 1m54s                 | plain `bun pm pack` ships broken exports and no README; procedure only in flake.nix                                              |
| A1   | PASS               | 4m18s                 | no doc for 1 -> "first" (`ordinal(numberToWords(n))`)                                                                            |
| A2   | PASS               | 4m33s                 | task ambiguity: which tests and how `-t` matches                                                                                 |
| A3   | PASS               | 4m41s                 | none                                                                                                                             |

Full friction log: in the thread's report message.
