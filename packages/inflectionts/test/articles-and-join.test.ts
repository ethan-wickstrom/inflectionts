import { describe, expect, test } from "bun:test"

import { Effect, Exit } from "effect"
import {
  a,
  an,
  BadNumValueError,
  defa,
  defan,
  getState,
  join,
  no,
  num,
  numberToWords,
  plural,
  pluralAdj,
  pluralNoun,
  pluralVerb
} from "inflectionts"

import { runInflector, runInflectorExit } from "./helpers.ts"

describe("indefinite articles (a / an)", () => {
  test("standard, phonetic exceptions, abbreviations, and counts", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(an).toBe(a)

        const cases: ReadonlyArray<readonly [string, string]> = [
          ["cat", "a cat"],
          ["ant", "an ant"],
          ["a", "an a"],
          ["b", "a b"],
          ["honest cat", "an honest cat"],
          ["dishonest cat", "a dishonest cat"],
          ["Honolulu sunset", "a Honolulu sunset"],
          ["mpeg", "an mpeg"],
          ["onetime holiday", "a onetime holiday"],
          ["Ugandan person", "a Ugandan person"],
          ["Ukrainian person", "a Ukrainian person"],
          ["Unabomber", "a Unabomber"],
          ["unanimous decision", "a unanimous decision"],
          ["US farmer", "a US farmer"],
          ["wild PIKACHU appeared", "a wild PIKACHU appeared"],
          ["YAML code block", "a YAML code block"],
          ["Core ML function", "a Core ML function"],
          ["JSON code block", "a JSON code block"],
          ["a cat", "a cat"],
          ["aardvark", "an aardvark"],
          ["ewe", "a ewe"],
          ["hour", "an hour"],
          ["houri", "a houri"],
          ["heir", "an heir"],
          ["honor", "an honor"],
          ["honour", "an honour"],
          ["Euler number", "an Euler number"],
          ["university", "a university"],
          ["unidentified", "an unidentified"],
          ["once", "a once"],
          ["one-armed bandit", "a one-armed bandit"],
          ["FBI agent", "an FBI agent"],
          ["HTML document", "an HTML document"],
          ["LCD display", "an LCD display"],
          ["X-ray", "an X-ray"],
          ["yttrium atom", "an yttrium atom"],
          ["n-th root", "an n-th root"],
          ["k-th term", "a k-th term"],
          ["  cat  ", "  a cat  "],
          ["  idea  ", "  an idea  "]
        ]

        for (const [input, expected] of cases) {
          expect(yield* an(input), `an('${input}')`).toBe(expected)
        }

        expect(yield* a("cat", 0)).toBe("0 cat")
        expect(yield* a("cat", 1)).toBe("a cat")
        expect(yield* a("cat", 2)).toBe("2 cat")

        const oneWordCases: ReadonlyArray<readonly [string, string]> = [
          ["cat", "a cat"],
          ["aardvark", "an aardvark"],
          ["ewe", "a ewe"],
          ["hour", "an hour"]
        ]
        for (const [word, expected] of oneWordCases) {
          const oneWord = yield* numberToWords(1, { one: "a" })
          expect(yield* a(`${oneWord} ${word}`)).toBe(expected)
        }

        yield* defa("ape")
        expect(yield* a("ape", 1)).toBe("a ape")
        yield* defan("horrendous.*")
        expect(yield* a("horrendous affectation", 1)).toBe("an horrendous affectation")
      })
    )
  })
})

describe("no and num", () => {
  test("no translates zero counts to 'no' and preserves whitespace", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(yield* no(" error", 0)).toBe(" no errors")
        expect(yield* no(" error", 1)).toBe(" 1 error")
        expect(yield* no(" error", 2)).toBe(" 2 errors")
        expect(yield* no("cat", "zero")).toBe("no cats")
        expect(yield* no("cat", "nil")).toBe("no cats")
        expect(yield* no("cat")).toBe("no cats")
      })
    )
  })

  test("num sets and clears persistentCount and validates numeric input", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect((yield* getState).persistentCount).toBeNull()
        expect(yield* num()).toBe("")
        expect((yield* getState).persistentCount).toBeNull()

        expect(yield* num(3)).toBe("3")
        expect((yield* getState).persistentCount).toBe(3)

        expect(yield* num()).toBe("")
        expect(yield* num("3")).toBe("3")
        expect((yield* getState).persistentCount).toBe(3)

        expect(yield* num(3, 1)).toBe("3")
        expect(yield* num(3, 0)).toBe("")
        expect((yield* getState).persistentCount).toBe(3)

        // README default counts example
        const out1 = `${yield* num(1, "")}${yield* plural("I")}${yield* pluralVerb(" saw")} ${yield* num(2)}${yield* pluralNoun(" saw")}`
        expect(out1).toBe("I saw 2 saws")

        const out2 = `${yield* num(2, "")}${yield* plural("I")}${yield* pluralVerb(" saw")} ${yield* num(1)}${yield* pluralNoun(" saw")}`
        expect(out2).toBe("we saw 1 saw")

        yield* num(2, false)
        expect(
          `${yield* pluralAdj("This")}${yield* pluralNoun(" error")}${yield* pluralVerb(" was")}`
        ).toBe("These errors were")
      })
    )

    const badCounts: ReadonlyArray<number | string> = ["text", Number.POSITIVE_INFINITY, Number.NaN]
    for (const bad of badCounts) {
      const exit = await runInflectorExit(num(bad))
      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit)) {
        const reason = exit.cause.reasons[0]
        expect(reason?._tag).toBe("Fail")
        if (reason?._tag === "Fail") {
          expect(reason.error).toBeInstanceOf(BadNumValueError)
        }
      }
    }
  })
})

describe("join", () => {
  test("handles 0, 1, 2, 3+ words, commas, custom sep, finalSep, conj, and spacing", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(yield* join([])).toBe("")
        expect(yield* join(null)).toBe("")
        expect(yield* join(["apple"])).toBe("apple")
        expect(yield* join(["apple"], { finalSep: "" })).toBe("apple")
        expect(yield* join(["apple"], { conj: "or" })).toBe("apple")

        expect(yield* join(["apple", "banana"])).toBe("apple and banana")
        expect(yield* join(["apple", "banana"], { finalSep: "" })).toBe("apple and banana")
        expect(yield* join(["apple", "banana"], { finalSep: "...", conj: "" })).toBe("apple banana")
        expect(
          yield* join(["apple", "banana"], { finalSep: "...", conj: "", conjSpaced: false })
        ).toBe("applebanana")
        expect(yield* join(["apple", "banana"], { conj: "or" })).toBe("apple or banana")
        expect(yield* join(["apple", "banana"], { conj: " or " })).toBe("apple  or  banana")
        expect(yield* join(["apple", "banana"], { conj: "&" })).toBe("apple & banana")
        expect(yield* join(["apple", "banana"], { conj: "&", conjSpaced: false })).toBe(
          "apple&banana"
        )
        expect(yield* join(["apple", "banana"], { conj: "& ", conjSpaced: false })).toBe(
          "apple& banana"
        )

        const words = ["apple", "banana", "carrot"]
        expect(yield* join(words)).toBe("apple, banana, and carrot")
        expect(yield* join(words, { finalSep: "" })).toBe("apple, banana and carrot")
        expect(yield* join(words, { finalSep: "..." })).toBe("apple, banana... and carrot")
        expect(yield* join(words, { finalSep: "...", conj: "" })).toBe("apple, banana... carrot")
        expect(yield* join(words, { conj: "or" })).toBe("apple, banana, or carrot")
        expect(yield* join(words, { finalSep: ";" })).toBe("apple, banana; and carrot")
        expect(
          yield* join(words, { sep: "/", sepSpaced: false, conj: "", conjSpaced: false })
        ).toBe("apple/banana/carrot")
        expect(yield* join(words, { conj: " or " })).toBe("apple, banana,  or  carrot")
        expect(yield* join(words, { conj: "+" })).toBe("apple, banana, + carrot")
        expect(yield* join(words, { conj: "&", conjSpaced: false })).toBe("apple, banana,&carrot")
        expect(yield* join(words, { conj: " &", conjSpaced: false })).toBe("apple, banana, &carrot")

        const commaWords = ["apple,fuji", "banana", "carrot"]
        expect(yield* join(commaWords)).toBe("apple,fuji; banana; and carrot")
        expect(yield* join(commaWords, { finalSep: "" })).toBe("apple,fuji; banana and carrot")
        expect(yield* join(commaWords, { finalSep: "..." })).toBe(
          "apple,fuji; banana... and carrot"
        )
        expect(yield* join(commaWords, { finalSep: "...", conj: "" })).toBe(
          "apple,fuji; banana... carrot"
        )
        expect(yield* join(commaWords, { conj: "or" })).toBe("apple,fuji; banana; or carrot")
        expect(yield* join(["apple", "1,000", "carrot"])).toBe("apple; 1,000; and carrot")
        expect(yield* join(["apple", "1,000", "carrot"], { sep: "," })).toBe(
          "apple, 1,000, and carrot"
        )
      })
    )
  })
})
