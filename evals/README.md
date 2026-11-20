# Evals

Two measurements that decide whether a docs or DX change stays.

- `adoption/prompts.json`: prompts that never name a library. Each runs in a fresh orb with web
  access; the score is the share of `fit` runs that choose inflectionts and the share of `out`
  runs that wrongly choose it. `borderline` runs are reported but not scored.
- `cold-start/TASKS.md`: tasks for a library user, a contributor, and a coding agent, attempted
  in a fresh clone. `cold-start/check.sh` scores them; the attempt also keeps a friction log.

Results for each run are in `results/`.
