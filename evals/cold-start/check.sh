#!/usr/bin/env bash
# Score the cold-start tasks in TASKS.md. Prints PASS or FAIL per task and exits non-zero
# when any task fails. Uses REPO, OUT, and USERAPP like TASKS.md.
set -uo pipefail

REPO="${REPO:-$(git rev-parse --show-toplevel)}"
OUT="${OUT:-/tmp/cold-start}"
USERAPP="${USERAPP:-/tmp/cs-user}"
failed=0

result() {
  if [[ "$2" == ok ]]; then
    echo "PASS $1"
  else
    echo "FAIL $1: $2"
    failed=1
  fi
}

# Run a TypeScript file with Bun from a directory and compare stdout to an expected string.
expect_output() {
  local id="$1" dir="$2" file="$3" expected="$4" actual path
  path="$file"
  [[ "$file" == /* ]] || path="$dir/$file"
  if [[ ! -f "$path" ]]; then
    result "$id" "missing $path"
    return
  fi
  actual="$(cd "$dir" && bun "$path" 2>&1)"
  local status=$?
  if [[ $status -ne 0 ]]; then
    result "$id" "exit $status: $(head -c 300 <<<"$actual")"
  elif [[ "$actual" != "$expected" ]]; then
    result "$id" "got $(head -c 300 <<<"$actual" | tr '\n' '|')"
  else
    result "$id" ok
  fi
}

# U1: dependency resolved from the npm registry, not a file, link, or workspace path.
if [[ ! -f "$USERAPP/node_modules/inflectionts/package.json" ]]; then
  result U1 "inflectionts is not installed in $USERAPP"
elif ! jq -e '.dependencies.inflectionts // empty | test("^(file:|link:|workspace:|/|\\.)") | not' \
  "$USERAPP/package.json" >/dev/null 2>&1; then
  result U1 "dependency is not a registry range: $(jq -c '.dependencies.inflectionts' "$USERAPP/package.json")"
elif ! grep -q '"inflectionts@[0-9]' "$USERAPP/bun.lock" 2>/dev/null; then
  result U1 "bun.lock does not resolve inflectionts from the registry"
else
  result U1 ok
fi

expect_output U2 "$USERAPP" plural.ts $'people\ncactuses\nanalyses\nmice\nsheep'
expect_output U3 "$USERAPP" article.ts $'an hour\na unicorn\na FAQ\nan apple\na European'
expect_output U4 "$USERAPP" numbers.ts \
  $'one thousand, two hundred and thirty-four\n21st\ntwenty-first'
expect_output U5 "$USERAPP" errors.ts 'InvalidWordError'

# C1: the full gate passes from a login shell, the way a new terminal would run it.
if (cd "$REPO" && bash -lc 'bun run check' >/tmp/cold-start-check.log 2>&1); then
  result C1 ok
else
  result C1 "bun run check failed; see /tmp/cold-start-check.log"
fi

if [[ "$(cat "$OUT/C2.txt" 2>/dev/null)" == octopuses ]]; then
  result C2 ok
else
  result C2 "C2.txt is '$(head -c 100 "$OUT/C2.txt" 2>/dev/null)'"
fi

# C3: behavior, a test that mentions it, and a commit on top of the starting HEAD.
probe="$REPO/packages/inflectionts/.cold-start-probe.ts"
cat >"$probe" <<'EOF'
import * as Effect from "effect/Effect"
import { Inflector, plural } from "inflectionts"
const out = await Effect.runPromise(
  Effect.all([plural("pokémon"), plural("Pokémon")]).pipe(Effect.provide(Inflector.layer))
)
console.log(out.join(","))
EOF
c3_out="$(cd "$REPO/packages/inflectionts" && bun "$probe" 2>&1)"
rm -f "$probe"
start_sha="$(cat "$OUT/start-sha" 2>/dev/null)"
if [[ "$c3_out" != "pokémon,Pokémon" ]]; then
  result C3 "plural gives '$c3_out'"
elif ! grep -rqi 'pok[eé]mon' "$REPO/packages/inflectionts/test"; then
  result C3 "no test mentions pokémon"
elif [[ -z "$start_sha" ]] || [[ "$(git -C "$REPO" rev-list --count "$start_sha..HEAD")" -lt 1 ]]; then
  result C3 "no commit after start-sha"
elif [[ -n "$(git -C "$REPO" status --porcelain --untracked-files=no -- packages)" ]]; then
  result C3 "uncommitted changes under packages/"
else
  result C3 ok
fi

# C4: a packed tarball with built JS, declarations, and no unresolved workspace ranges.
tarball="$(cat "$OUT/C4.txt" 2>/dev/null)"
if [[ ! -f "$tarball" ]]; then
  result C4 "no tarball at '$tarball'"
else
  listing="$(tar -tzf "$tarball")"
  manifest="$(tar -xzOf "$tarball" package/package.json)"
  if ! grep -qx 'package/dist/index.js' <<<"$listing" || ! grep -qx 'package/dist/index.d.ts' <<<"$listing"; then
    result C4 "tarball lacks dist/index.js or dist/index.d.ts"
  elif grep -qE '"(workspace|catalog):' <<<"$manifest"; then
    result C4 "packed package.json still has workspace: or catalog: ranges"
  else
    result C4 ok
  fi
fi

a1="$REPO/packages/inflectionts/test/ordinal-words.test.ts"
if [[ ! -f "$a1" ]]; then
  result A1 "missing $a1"
elif ! grep -q first "$a1" || ! grep -q third "$a1"; then
  result A1 "test does not mention first and third"
elif ! (cd "$REPO" && bun test "$a1" >/tmp/cold-start-a1.log 2>&1); then
  result A1 "test fails; see /tmp/cold-start-a1.log"
else
  result A1 ok
fi

expected_a2="$(cd "$REPO" && bun test -t ordinal packages/inflectionts 2>&1 | sed -nE 's/^ *([0-9]+) pass$/\1/p')"
if [[ -n "$expected_a2" && "$(tr -d '[:space:]' 2>/dev/null <"$OUT/A2.txt")" == "$expected_a2" ]]; then
  result A2 ok
else
  result A2 "A2.txt is '$(head -c 50 "$OUT/A2.txt" 2>/dev/null)', expected $expected_a2"
fi

a3="$(tr -d '[:space:]' 2>/dev/null <"$OUT/A3.txt")"
if [[ "$a3" == repos/effect/packages/* && -f "$REPO/$a3" ]] \
  && grep -qE 'export const Service' "$REPO/$a3"; then
  result A3 ok
else
  result A3 "A3.txt is '$a3'"
fi

exit "$failed"
