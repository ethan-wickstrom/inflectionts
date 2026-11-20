import { describe, expect, test } from "bun:test"

import * as Effect from "effect/Effect"
import {
  BadNumValueError,
  classical,
  defadj,
  defnoun,
  defverb,
  getState,
  inflect,
  InflectTemplateError,
  no,
  num,
  ordinal,
  plural
} from "inflectionts"

import { runInflector } from "../helpers.ts"

// Port of jaraco/inflect tests/test_inflections.py.
// Covered elsewhere (not duplicated here):
// - test_many: test/plurals.test.ts ("inflections.txt corpus")
// - test_negative_ordinals, test_decimal_ordinals: test/numbers.test.ts ("ordinal")
// - test_prespart: test/plurals.test.ts ("presentParticiple")
// - test_inflect_on_tuples, test_inflect_on_builtin_constants, test_inflect_keyword_args,
//   test_inflect_rejects_nonliteral_numbers: test/inflect-template.test.ts
describe("test_inflections.py", () => {
  test("test_def", async () => {
    await runInflector(
      Effect.gen(function* () {
        yield* defnoun("kin", "kine")
        yield* defnoun("(.*)x", "$1xen")

        yield* defverb("foobar", "feebar", "foobar", "feebar", "foobars", "feebar")

        yield* defadj("red", "red|gules")

        expect(yield* no("kin", 0)).toBe("no kine")
        expect(yield* no("kin", 1)).toBe("1 kin")
        expect(yield* no("kin", 2)).toBe("2 kine")

        expect(yield* no("regex", 0)).toBe("no regexen")

        expect(yield* plural("foobar", 2)).toBe("feebar")
        expect(yield* plural("foobars", 2)).toBe("feebar")

        expect(yield* plural("red", 0)).toBe("red")
        expect(yield* plural("red", 1)).toBe("red")
        expect(yield* plural("red", 2)).toBe("red")
        yield* classical({ all: true })
        expect(yield* plural("red", 0)).toBe("red")
        expect(yield* plural("red", 1)).toBe("red")
        expect(yield* plural("red", 2)).toBe("gules")
      })
    )
  })

  test("test_ordinal", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(yield* ordinal(0)).toBe("0th")
        expect(yield* ordinal(1)).toBe(yield* ordinal("1"))
        expect(yield* ordinal("1")).toBe("1st")
        expect(yield* ordinal(2)).toBe("2nd")
        expect(yield* ordinal(3)).toBe("3rd")
        expect(yield* ordinal(4)).toBe("4th")
        expect(yield* ordinal(5)).toBe("5th")
        expect(yield* ordinal(6)).toBe("6th")
        expect(yield* ordinal(7)).toBe("7th")
        expect(yield* ordinal(8)).toBe("8th")
        expect(yield* ordinal(9)).toBe("9th")
        expect(yield* ordinal(10)).toBe("10th")
        expect(yield* ordinal(11)).toBe("11th")
        expect(yield* ordinal(12)).toBe("12th")
        expect(yield* ordinal(13)).toBe("13th")
        expect(yield* ordinal(14)).toBe("14th")
        expect(yield* ordinal(15)).toBe("15th")
        expect(yield* ordinal(16)).toBe("16th")
        expect(yield* ordinal(17)).toBe("17th")
        expect(yield* ordinal(18)).toBe("18th")
        expect(yield* ordinal(19)).toBe("19th")
        expect(yield* ordinal(20)).toBe("20th")
        expect(yield* ordinal(21)).toBe("21st")
        expect(yield* ordinal(22)).toBe("22nd")
        expect(yield* ordinal(23)).toBe("23rd")
        expect(yield* ordinal(24)).toBe("24th")
        expect(yield* ordinal(100)).toBe("100th")
        expect(yield* ordinal(101)).toBe("101st")
        expect(yield* ordinal(102)).toBe("102nd")
        expect(yield* ordinal(103)).toBe("103rd")
        expect(yield* ordinal(104)).toBe("104th")

        expect(yield* ordinal(1.1)).toBe(yield* ordinal("1.1"))
        expect(yield* ordinal("1.1")).toBe("1.1st")
        expect(yield* ordinal(1.2)).toBe("1.2nd")
        expect(yield* ordinal(5.502)).toBe("5.502nd")

        expect(yield* ordinal("zero")).toBe("zeroth")
        expect(yield* ordinal("one")).toBe("first")
        expect(yield* ordinal("two")).toBe("second")
        expect(yield* ordinal("three")).toBe("third")
        expect(yield* ordinal("four")).toBe("fourth")
        expect(yield* ordinal("five")).toBe("fifth")
        expect(yield* ordinal("six")).toBe("sixth")
        expect(yield* ordinal("seven")).toBe("seventh")
        expect(yield* ordinal("eight")).toBe("eighth")
        expect(yield* ordinal("nine")).toBe("ninth")
        expect(yield* ordinal("ten")).toBe("tenth")
        expect(yield* ordinal("eleven")).toBe("eleventh")
        expect(yield* ordinal("twelve")).toBe("twelfth")
        expect(yield* ordinal("thirteen")).toBe("thirteenth")
        expect(yield* ordinal("fourteen")).toBe("fourteenth")
        expect(yield* ordinal("fifteen")).toBe("fifteenth")
        expect(yield* ordinal("sixteen")).toBe("sixteenth")
        expect(yield* ordinal("seventeen")).toBe("seventeenth")
        expect(yield* ordinal("eighteen")).toBe("eighteenth")
        expect(yield* ordinal("nineteen")).toBe("nineteenth")
        expect(yield* ordinal("twenty")).toBe("twentieth")
        expect(yield* ordinal("twenty-one")).toBe("twenty-first")
        expect(yield* ordinal("twenty-two")).toBe("twenty-second")
        expect(yield* ordinal("twenty-three")).toBe("twenty-third")
        expect(yield* ordinal("twenty-four")).toBe("twenty-fourth")
        expect(yield* ordinal("one hundred")).toBe("one hundredth")
        expect(yield* ordinal("one hundred and one")).toBe("one hundred and first")
        expect(yield* ordinal("one hundred and two")).toBe("one hundred and second")
        expect(yield* ordinal("one hundred and three")).toBe("one hundred and third")
        expect(yield* ordinal("one hundred and four")).toBe("one hundred and fourth")
      })
    )
  })

  test("test_ordinal_malformed_input", async () => {
    await runInflector(
      Effect.gen(function* () {
        // unaffected, still-working cases
        expect(yield* ordinal(11)).toBe("11th")
        expect(yield* ordinal("11")).toBe("11th")
        expect(yield* ordinal("11 ")).toBe("11 th")

        // diverges: typed Effect failure instead of a raised Python exception
        expect(yield* Effect.flip(ordinal("11 11"))).toBeInstanceOf(BadNumValueError)
      })
    )
  })

  test("test_inflect_signed_numbers", async () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["number_to_words(-12)", "minus twelve"],
      ["number_to_words(+12)", "twelve"],
      ["number_to_words(-1.5)", "minus one point five"],
      ["number_to_words(+1.5)", "one point five"],
      ["number_to_words(num=-12)", "minus twelve"],
      ["number_to_words(num=+12)", "twelve"],
      ["plural('error', -2)", "errors"],
      ["plural('error', count=+1)", "error"],
      ["no('error', -2)", "-2 errors"],
      ["num(-2, False)no('error')", "-2 errors"],
      ["plural('error', [-2, +1])", "errors"],
      ["plural('error', (-2, +1))", "errors"]
    ]
    for (const [text, expected] of cases) {
      await runInflector(
        Effect.gen(function* () {
          yield* num(3)
          expect(yield* inflect(text), text).toBe(expected)
          expect((yield* getState).persistentCount).toBe(3)
        })
      )
    }
  })

  test("test_NameError_in_strings", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(yield* inflect("plural('two')")).toBe("twoes")
        // diverges: InflectTemplateError typed failure instead of Python's NameError
        expect(yield* Effect.flip(inflect("plural(two)"))).toBeInstanceOf(InflectTemplateError)
      })
    )
  })
})
