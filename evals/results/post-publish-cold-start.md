# Cold-start after npm publish (commit 76ff229, 2026-11-21)

Thread: T-01a1fbda-e725-7282-84f8-1746e3ebd298, a fresh orb with no access to this repository's
other threads or `evals/results/`. `@ethan-wickstrom/inflectionts@0.1.0` was on npm. Score: **12/12**,
the first full pass.

| Task | Baseline (2bd0f42) | Rerun (823ddf3) | After publish (76ff229) |
| ---- | ------------------ | --------------- | ----------------------- |
| U1   | FAIL               | FAIL            | 0:09                    |
| U2   | 2:13               | 0:46            | 0:24                    |
| U3   | 2:25               | 0:46            | 0:24                    |
| U4   | 2:25               | 0:46            | 0:24                    |
| U5   | 2:25               | 0:46            | 0:24                    |
| C1   | 0:51               | 1:07            | 0:49                    |
| C2   | 1:02               | 1:12            | 0:53                    |
| C3   | 3:38               | 1:56            | 1:56                    |
| C4   | 1:54               | 2:02            | 2:00                    |
| A1   | 4:18               | 2:12            | 2:17                    |
| A2   | 4:33               | 2:12            | 2:24                    |
| A3   | 4:41               | 2:30            | 2:52                    |

Times are elapsed from the start of the attempt. U1 ran `bun add @ethan-wickstrom/inflectionts effect`
from the README and installed 0.1.0 from the registry.

Remaining friction:

- C3: the `defnoun` how-to example used `pokémon`, the word C3 makes built-in, so the example would
  stop showing a word the library gets wrong. Fixed: the example now uses `bison`.
- C3: an edit anchored on the duplicated list tails in `data.ts` matched twice; the header comment
  warns about this and the agent recovered in about 30 s.
- U2 and U3: `cactuses` vs `cacti` and `a FAQ` vs `an FAQ` are judgment calls the tasks leave open;
  the agent used the documented defaults.
