import { describe, expect, test } from "bun:test"

import {
  BadChunkingOptionError,
  BadNumValueError,
  numberToCurrency,
  numberToWords,
  numberToWordsList,
  NumOutOfRangeError,
  ordinal
} from "@ethan-wickstrom/inflectionts"
import { Effect, Exit } from "effect"

import { runInflector, runInflectorExit } from "./helpers.ts"

describe("ordinal", () => {
  test("integers, negatives, decimals, words, and malformed input", async () => {
    await runInflector(
      Effect.gen(function* () {
        const numericCases: ReadonlyArray<readonly [number | string, string]> = [
          [0, "0th"],
          [1, "1st"],
          ["1", "1st"],
          [2, "2nd"],
          [3, "3rd"],
          [4, "4th"],
          [10, "10th"],
          [11, "11th"],
          [12, "12th"],
          [13, "13th"],
          [14, "14th"],
          [20, "20th"],
          [21, "21st"],
          [22, "22nd"],
          [23, "23rd"],
          [24, "24th"],
          [100, "100th"],
          [101, "101st"],
          [102, "102nd"],
          [103, "103rd"],
          [104, "104th"],
          [347, "347th"],
          [-1, "-1st"],
          ["-1", "-1st"],
          [-2, "-2nd"],
          [-3, "-3rd"],
          [-4, "-4th"],
          [-11, "-11th"],
          [-12, "-12th"],
          [-13, "-13th"],
          [-21, "-21st"],
          [-22, "-22nd"],
          [-113, "-113th"],
          [1.1, "1.1st"],
          ["1.1", "1.1st"],
          [1.2, "1.2nd"],
          [5.502, "5.502nd"],
          ["1.23", "1.23rd"],
          ["7.09", "7.09th"],
          ["11 ", "11 th"]
        ]
        for (const [input, expected] of numericCases) {
          expect(yield* ordinal(input), `ordinal(${String(input)})`).toBe(expected)
        }

        const wordCases: ReadonlyArray<readonly [string, string]> = [
          ["zero", "zeroth"],
          ["one", "first"],
          ["two", "second"],
          ["three", "third"],
          ["four", "fourth"],
          ["five", "fifth"],
          ["six", "sixth"],
          ["seven", "seventh"],
          ["eight", "eighth"],
          ["nine", "ninth"],
          ["ten", "tenth"],
          ["eleven", "eleventh"],
          ["twelve", "twelfth"],
          ["thirteen", "thirteenth"],
          ["twenty", "twentieth"],
          ["twenty-one", "twenty-first"],
          ["twenty-two", "twenty-second"],
          ["twenty-three", "twenty-third"],
          ["twenty-four", "twenty-fourth"],
          ["one hundred", "one hundredth"],
          ["one hundred and one", "one hundred and first"],
          ["one hundred and two", "one hundred and second"],
          ["one hundred and three", "one hundred and third"],
          ["one hundred and four", "one hundred and fourth"]
        ]
        for (const [input, expected] of wordCases) {
          expect(yield* ordinal(input)).toBe(expected)
        }
      })
    )

    const malformedExit = await runInflectorExit(ordinal("11 11"))
    expect(Exit.isFailure(malformedExit)).toBe(true)
    if (Exit.isFailure(malformedExit)) {
      const reason = malformedExit.cause.reasons[0]
      expect(reason?._tag).toBe("Fail")
      if (reason?._tag === "Fail") {
        expect(reason.error).toBeInstanceOf(BadNumValueError)
      }
    }
  })
})

describe("numberToWords and numberToWordsList", () => {
  test("thresholds, commas, and scientific notation", async () => {
    await runInflector(
      Effect.gen(function* () {
        for (let thresh = 0; thresh <= 20; thresh++) {
          for (let n = 0; n <= 20; n++) {
            const threshed = yield* numberToWords(n, { threshold: thresh })
            const words = yield* numberToWords(n)
            expect(threshed).toBe(n <= thresh ? words : String(n))
          }
        }

        expect(yield* numberToWords(999, { threshold: 500 })).toBe("999")
        expect(yield* numberToWords(1000, { threshold: 500 })).toBe("1,000")
        expect(yield* numberToWords(10000, { threshold: 500 })).toBe("10,000")
        expect(yield* numberToWords(100000, { threshold: 500 })).toBe("100,000")
        expect(yield* numberToWords(1000000, { threshold: 500 })).toBe("1,000,000")

        expect(yield* numberToWords(999.3, { threshold: 500 })).toBe("999.3")
        expect(yield* numberToWords(1000.3, { threshold: 500 })).toBe("1,000.3")
        expect(yield* numberToWords(1000000.3, { threshold: 500 })).toBe("1,000,000.3")

        expect(yield* numberToWords(1000000, { threshold: 500, comma: 0 })).toBe("1000000")
        expect(yield* numberToWords(1000.3, { threshold: 500, comma: "_" })).toBe("1_000.3")
        expect(yield* numberToWords(1000000, { threshold: 500, comma: "_" })).toBe("1_000_000")
        expect(yield* numberToWords(1234, { comma: ";" })).toBe(
          "one thousand; two hundred and thirty-four"
        )

        expect(yield* numberToWords(0.000001)).toBe("zero point zero zero zero zero zero one")
        expect(yield* numberToWords(1e20)).toBe("one hundred quintillion")
      })
    )
  })

  test("full test_numwords matrix across groups 0..3 and ordinals", async () => {
    const matrix: ReadonlyArray<ReadonlyArray<string>> = [
      ["0", "zero", "zero", "zero", "zero", "zeroth"],
      ["1", "one", "one", "one", "one", "first"],
      ["2", "two", "two", "two", "two", "second"],
      ["10", "ten", "one, zero", "ten", "ten", "tenth"],
      ["19", "nineteen", "one, nine", "nineteen", "nineteen", "nineteenth"],
      ["21", "twenty-one", "two, one", "twenty-one", "twenty-one", "twenty-first"],
      ["100", "one hundred", "one, zero, zero", "one, zero zero", "one zero zero", "one hundredth"],
      [
        "101",
        "one hundred and one",
        "one, zero, one",
        "one, zero one",
        "one zero one",
        "one hundred and first"
      ],
      [
        "110",
        "one hundred and ten",
        "one, one, zero",
        "one, ten",
        "one ten",
        "one hundred and tenth"
      ],
      [
        "999",
        "nine hundred and ninety-nine",
        "nine, nine, nine",
        "nine, ninety-nine",
        "nine ninety-nine",
        "nine hundred and ninety-ninth"
      ],
      [
        "1000",
        "one thousand",
        "one, zero, zero, zero",
        "ten, zero zero",
        "one, zero zero zero",
        "one thousandth"
      ],
      [
        "1001",
        "one thousand and one",
        "one, zero, zero, one",
        "ten, zero one",
        "one, zero zero one",
        "one thousand and first"
      ],
      [
        "1100",
        "one thousand, one hundred",
        "one, one, zero, zero",
        "eleven, zero zero",
        "one, one zero zero",
        "one thousand, one hundredth"
      ],
      [
        "123456",
        "one hundred and twenty-three thousand, four hundred and fifty-six",
        "one, two, three, four, five, six",
        "twelve, thirty-four, fifty-six",
        "one twenty-three, four fifty-six",
        "one hundred and twenty-three thousand, four hundred and fifty-sixth"
      ],
      [
        "0123456",
        "one hundred and twenty-three thousand, four hundred and fifty-six",
        "zero, one, two, three, four, five, six",
        "zero, twelve, thirty-four, fifty-six",
        "zero, one twenty-three, four fifty-six",
        "one hundred and twenty-three thousand, four hundred and fifty-sixth"
      ],
      [
        "12_345_678",
        "twelve million, three hundred and forty-five thousand, six hundred and seventy-eight",
        "one, two, three, four, five, six, seven, eight",
        "twelve, thirty-four, fifty-six, seventy-eight",
        "twelve, three forty-five, six seventy-eight"
      ],
      [
        "12345678901234567890",
        "twelve quintillion, three hundred and forty-five quadrillion, six hundred and seventy-eight trillion, nine hundred and one billion, two hundred and thirty-four million, five hundred and sixty-seven thousand, eight hundred and ninety",
        "one, two, three, four, five, six, seven, eight, nine, zero, one, two, three, four, five, six, seven, eight, nine, zero",
        "twelve, thirty-four, fifty-six, seventy-eight, ninety, twelve, thirty-four, fifty-six, seventy-eight, ninety",
        "twelve, three forty-five, six seventy-eight, nine zero one, two thirty-four, five sixty-seven, eight ninety",
        "twelve quintillion, three hundred and forty-five quadrillion, six hundred and seventy-eight trillion, nine hundred and one billion, two hundred and thirty-four million, five hundred and sixty-seven thousand, eight hundred and ninetieth"
      ],
      [
        "0.987654",
        "zero point nine eight seven six five four",
        "zero, point, nine, eight, seven, six, five, four",
        "zero, point, ninety-eight, seventy-six, fifty-four",
        "zero, point, nine eighty-seven, six fifty-four",
        "zeroth point nine eight seven six five four",
        "zero point nine eight seven six five fourth"
      ],
      [
        ".987654",
        "point nine eight seven six five four",
        "point, nine, eight, seven, six, five, four",
        "point, ninety-eight, seventy-six, fifty-four",
        "point, nine eighty-seven, six fifty-four",
        "point nine eight seven six five four",
        "point nine eight seven six five fourth"
      ],
      [
        "9876.54",
        "nine thousand, eight hundred and seventy-six point five four",
        "nine, eight, seven, six, point, five, four",
        "ninety-eight, seventy-six, point, fifty-four",
        "nine, eight seventy-six, point, fifty-four",
        "nine thousand, eight hundred and seventy-sixth point five four",
        "nine thousand, eight hundred and seventy-six point five fourth"
      ],
      [
        "101.202.303",
        "one hundred and one point two zero two three zero three",
        "one, zero, one, point, two, zero, two, point, three, zero, three",
        "one, zero one, point, two, zero two, point, three, zero three",
        "one zero one, point, two zero two, point, three zero three"
      ],
      [
        "98765.",
        "ninety-eight thousand, seven hundred and sixty-five point",
        "nine, eight, seven, six, five, point",
        "nine, eighty-seven, sixty-five, point",
        "ninety-eight, seven sixty-five, point"
      ]
    ]

    await runInflector(
      Effect.gen(function* () {
        for (const row of matrix) {
          const input = row[0]!
          expect(yield* numberToWords(input), `g0 ${input}`).toBe(row[1]!)
          expect(yield* numberToWords(input, { group: 1 }), `g1 ${input}`).toBe(row[2]!)
          expect(yield* numberToWords(input, { group: 2 }), `g2 ${input}`).toBe(row[3]!)
          expect(yield* numberToWords(input, { group: 3 }), `g3 ${input}`).toBe(row[4]!)
          if (row[5] !== undefined) {
            const ord = yield* ordinal(input)
            expect(yield* numberToWords(ord), `ord-in ${input}`).toBe(row[5])
            const ordOut = yield* ordinal(yield* numberToWords(input))
            expect(ordOut, `ord-out ${input}`).toBe(row[6] ?? row[5])
          }
        }

        // Right-aligned grouping (#217)
        expect(yield* numberToWords("123", { group: 2 })).toBe("one, twenty-three")
        expect(yield* numberToWords("1234", { group: 2 })).toBe("twelve, thirty-four")
        expect(yield* numberToWords("12345", { group: 2 })).toBe("one, twenty-three, forty-five")
        expect(yield* numberToWords("98765", { group: 3 })).toBe("ninety-eight, seven sixty-five")
        expect(yield* numberToWords("1234567", { group: 3 })).toBe(
          "one, two thirty-four, five sixty-seven"
        )

        // List output, custom andword / zero / one / decimal
        expect(yield* numberToWordsList(1234)).toEqual([
          "one thousand",
          "two hundred and thirty-four"
        ])
        expect(yield* numberToWordsList("+10")).toEqual(["plus", "ten"])
        expect(yield* numberToWords(1234, { andword: "" })).toBe(
          "one thousand, two hundred thirty-four"
        )
        expect(yield* numberToWords(1234, { andword: ", plus" })).toBe(
          "one thousand, two hundred, plus thirty-four"
        )
        expect(yield* numberToWords(140, { andword: "," })).toBe("one hundred, forty")
        expect(yield* numberToWords(541140, { andword: "," })).toBe(
          "five hundred, forty-one thousand, one hundred, forty"
        )
        expect(yield* numberToWords("1", { decimal: null })).toBe("one")
        expect(yield* numberToWords("1234.5678", { decimal: null })).toBe(
          "twelve million, three hundred and forty-five thousand, six hundred and seventy-eight"
        )
        expect(yield* numberToWords(555_1202, { group: 1, zero: "oh" })).toBe(
          "five, five, five, one, two, oh, two"
        )
        expect(yield* numberToWords(555_1202, { group: 1, one: "unity" })).toBe(
          "five, five, five, unity, two, zero, two"
        )
        expect(yield* numberToWords(123.456, { group: 1, decimal: "mark" })).toBe(
          "one, two, three, mark, four, five, six"
        )

        // Issue #131: bare ordinal suffixes evaluate to zero
        for (const suff of ["st", "nd", "rd", "th"]) {
          expect(yield* numberToWords(suff)).toBe("zero")
        }

        // Issue #242: boundary at 10^33 decillion
        expect(yield* numberToWords(10n ** 33n)).toBe("one decillion")
      })
    )

    for (const huge of [10n ** 36n, 10n ** 40n, 10n ** 100n]) {
      const exit = await runInflectorExit(numberToWords(huge))
      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit)) {
        const reason = exit.cause.reasons[0]
        expect(reason?._tag).toBe("Fail")
        if (reason?._tag === "Fail") {
          expect(reason.error).toBeInstanceOf(NumOutOfRangeError)
        }
      }
    }

    for (const badGroup of [-1, 4, 1.5]) {
      const exit = await runInflectorExit(numberToWords(42, { group: badGroup }))
      expect(Exit.isFailure(exit)).toBe(true)
      if (Exit.isFailure(exit)) {
        const reason = exit.cause.reasons[0]
        expect(reason?._tag).toBe("Fail")
        if (reason?._tag === "Fail") {
          expect(reason.error).toBeInstanceOf(BadChunkingOptionError)
        }
      }
    }
  })
})

describe("numberToCurrency", () => {
  test("formats check-style currency with exact half-up rounding", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(yield* numberToCurrency(100_020.56)).toBe(
          "one hundred thousand and twenty and 56/100"
        )
        expect(yield* numberToCurrency(1234)).toBe(
          "one thousand, two hundred and thirty-four and 00/100"
        )
        expect(yield* numberToCurrency(0.07)).toBe("zero and 07/100")
        expect(yield* numberToCurrency(1.5)).toBe("one and 50/100")
        expect(yield* numberToCurrency("19.99")).toBe("nineteen and 99/100")
        expect(yield* numberToCurrency(101.01, { andword: "" })).toBe("one hundred one and 01/100")
        expect(yield* numberToCurrency(1234.5, { andword: "" })).toBe(
          "one thousand, two hundred thirty-four and 50/100"
        )

        // Exact half-up rounding (immune to IEEE-754 binary float drift!)
        expect(yield* numberToCurrency(2.675)).toBe("two and 68/100")
        expect(yield* numberToCurrency(2.674)).toBe("two and 67/100")
        expect(yield* numberToCurrency("0.995")).toBe("one and 00/100")
      })
    )

    const badCurrency: ReadonlyArray<number | string> = [
      "ten",
      "nan",
      "inf",
      Number.NaN,
      Number.POSITIVE_INFINITY
    ]
    for (const bad of badCurrency) {
      const exit = await runInflectorExit(numberToCurrency(bad))
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
