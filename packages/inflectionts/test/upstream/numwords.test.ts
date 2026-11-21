import { describe, expect, test } from "bun:test"

import { numberToCurrency, numberToWords, ordinal } from "@ethan-wickstrom/inflectionts"
import * as Effect from "effect/Effect"

import { runInflector } from "../helpers.ts"

// Port of jaraco/inflect tests/test_numwords.py.
// Covered elsewhere (not duplicated here):
// - test_loop, test_scientific_notation_float, test_issue_131, test_issue_242,
//   test_number_to_currency, test_number_to_currency_bad_value, test_issue_217:
//   test/numbers.test.ts
describe("test_numwords.py", () => {
  test("test_lines", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(yield* numberToWords(999, { threshold: 500 })).toBe("999")
        expect(yield* numberToWords(1000, { threshold: 500 })).toBe("1,000")
        expect(yield* numberToWords(10000, { threshold: 500 })).toBe("10,000")
        expect(yield* numberToWords(100000, { threshold: 500 })).toBe("100,000")
        expect(yield* numberToWords(1000000, { threshold: 500 })).toBe("1,000,000")

        expect(yield* numberToWords(999.3, { threshold: 500 })).toBe("999.3")
        expect(yield* numberToWords(1000.3, { threshold: 500 })).toBe("1,000.3")
        expect(yield* numberToWords(10000.3, { threshold: 500 })).toBe("10,000.3")

        expect(yield* numberToWords(100000.3, { threshold: 500 })).toBe("100,000.3")
        expect(yield* numberToWords(1000000.3, { threshold: 500 })).toBe("1,000,000.3")

        expect(yield* numberToWords(999, { threshold: 500, comma: 0 })).toBe("999")
        expect(yield* numberToWords(1000, { threshold: 500, comma: 0 })).toBe("1000")
        expect(yield* numberToWords(10000, { threshold: 500, comma: 0 })).toBe("10000")
        expect(yield* numberToWords(100000, { threshold: 500, comma: 0 })).toBe("100000")
        expect(yield* numberToWords(1000000, { threshold: 500, comma: 0 })).toBe("1000000")

        expect(yield* numberToWords(999.3, { threshold: 500, comma: 0 })).toBe("999.3")
        expect(yield* numberToWords(1000.3, { threshold: 500, comma: 0 })).toBe("1000.3")
        expect(yield* numberToWords(10000.3, { threshold: 500, comma: 0 })).toBe("10000.3")
        expect(yield* numberToWords(100000.3, { threshold: 500, comma: 0 })).toBe("100000.3")
        expect(yield* numberToWords(1000000.3, { threshold: 500, comma: 0 })).toBe("1000000.3")
        expect(yield* numberToWords(1000.3, { threshold: 500, comma: "_" })).toBe("1_000.3")
        expect(yield* numberToWords(1000000, { threshold: 500, comma: "_" })).toBe("1_000_000")
        expect(yield* numberToWords(1234, { comma: ";" })).toBe(
          "one thousand; two hundred and thirty-four"
        )
      })
    )
  })

  test("test_array", async () => {
    const nw: ReadonlyArray<ReadonlyArray<string>> = [
      ["0", "zero", "zero", "zero", "zero", "zeroth"],
      ["1", "one", "one", "one", "one", "first"],
      ["2", "two", "two", "two", "two", "second"],
      ["3", "three", "three", "three", "three", "third"],
      ["4", "four", "four", "four", "four", "fourth"],
      ["5", "five", "five", "five", "five", "fifth"],
      ["6", "six", "six", "six", "six", "sixth"],
      ["7", "seven", "seven", "seven", "seven", "seventh"],
      ["8", "eight", "eight", "eight", "eight", "eighth"],
      ["9", "nine", "nine", "nine", "nine", "ninth"],
      ["10", "ten", "one, zero", "ten", "ten", "tenth"],
      ["11", "eleven", "one, one", "eleven", "eleven", "eleventh"],
      ["12", "twelve", "one, two", "twelve", "twelve", "twelfth"],
      ["13", "thirteen", "one, three", "thirteen", "thirteen", "thirteenth"],
      ["14", "fourteen", "one, four", "fourteen", "fourteen", "fourteenth"],
      ["15", "fifteen", "one, five", "fifteen", "fifteen", "fifteenth"],
      ["16", "sixteen", "one, six", "sixteen", "sixteen", "sixteenth"],
      ["17", "seventeen", "one, seven", "seventeen", "seventeen", "seventeenth"],
      ["18", "eighteen", "one, eight", "eighteen", "eighteen", "eighteenth"],
      ["19", "nineteen", "one, nine", "nineteen", "nineteen", "nineteenth"],
      ["20", "twenty", "two, zero", "twenty", "twenty", "twentieth"],
      ["21", "twenty-one", "two, one", "twenty-one", "twenty-one", "twenty-first"],
      ["29", "twenty-nine", "two, nine", "twenty-nine", "twenty-nine", "twenty-ninth"],
      ["99", "ninety-nine", "nine, nine", "ninety-nine", "ninety-nine", "ninety-ninth"],
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
        "111",
        "one hundred and eleven",
        "one, one, one",
        "one, eleven",
        "one eleven",
        "one hundred and eleventh"
      ],
      [
        "900",
        "nine hundred",
        "nine, zero, zero",
        "nine, zero zero",
        "nine zero zero",
        "nine hundredth"
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
        "1010",
        "one thousand and ten",
        "one, zero, one, zero",
        "ten, ten",
        "one, zero ten",
        "one thousand and tenth"
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
        "2000",
        "two thousand",
        "two, zero, zero, zero",
        "twenty, zero zero",
        "two, zero zero zero",
        "two thousandth"
      ],
      [
        "10000",
        "ten thousand",
        "one, zero, zero, zero, zero",
        "one, zero zero, zero zero",
        "ten, zero zero zero",
        "ten thousandth"
      ],
      [
        "100000",
        "one hundred thousand",
        "one, zero, zero, zero, zero, zero",
        "ten, zero zero, zero zero",
        "one zero zero, zero zero zero",
        "one hundred thousandth"
      ],
      [
        "100001",
        "one hundred thousand and one",
        "one, zero, zero, zero, zero, one",
        "ten, zero zero, zero one",
        "one zero zero, zero zero one",
        "one hundred thousand and first"
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
        "1234567",
        "one million, two hundred and thirty-four thousand, " + "five hundred and sixty-seven",
        "one, two, three, four, five, six, seven",
        "one, twenty-three, forty-five, sixty-seven",
        "one, two thirty-four, five sixty-seven",
        "one million, two hundred and thirty-four thousand, " + "five hundred and sixty-seventh"
      ],
      [
        "12345678",
        "twelve million, three hundred and forty-five thousand, " + "six hundred and seventy-eight",
        "one, two, three, four, five, six, seven, eight",
        "twelve, thirty-four, fifty-six, seventy-eight",
        "twelve, three forty-five, six seventy-eight",
        "twelve million, three hundred and forty-five thousand, " + "six hundred and seventy-eighth"
      ],
      [
        "12_345_678",
        "twelve million, three hundred and forty-five thousand, " + "six hundred and seventy-eight",
        "one, two, three, four, five, six, seven, eight",
        "twelve, thirty-four, fifty-six, seventy-eight",
        "twelve, three forty-five, six seventy-eight"
      ],
      [
        "1234,5678",
        "twelve million, three hundred and forty-five thousand, " + "six hundred and seventy-eight",
        "one, two, three, four, five, six, seven, eight",
        "twelve, thirty-four, fifty-six, seventy-eight",
        "twelve, three forty-five, six seventy-eight"
      ],
      [
        "1234567890",
        "one billion, two hundred and thirty-four million, five hundred " +
          "and sixty-seven thousand, eight hundred and ninety",
        "one, two, three, four, five, six, seven, eight, nine, zero",
        "twelve, thirty-four, fifty-six, seventy-eight, ninety",
        "one, two thirty-four, five sixty-seven, eight ninety",
        "one billion, two hundred and thirty-four million, five hundred " +
          "and sixty-seven thousand, eight hundred and ninetieth"
      ],
      [
        "123456789012345",
        "one hundred and twenty-three trillion, four hundred and " +
          "fifty-six billion, seven hundred and eighty-nine million, twelve " +
          "thousand, three hundred and forty-five",
        "one, two, three, four, five, six, seven, eight, nine, zero, one, " +
          "two, three, four, five",
        "one, twenty-three, forty-five, sixty-seven, eighty-nine, zero one, twenty-three, " +
          "forty-five",
        "one twenty-three, four fifty-six, seven eighty-nine, " + "zero twelve, three forty-five",
        "one hundred and twenty-three trillion, four hundred and " +
          "fifty-six billion, seven hundred and eighty-nine million, " +
          "twelve thousand, three hundred and forty-fifth"
      ],
      [
        "12345678901234567890",
        "twelve quintillion, three hundred and forty-five quadrillion, " +
          "six hundred and seventy-eight trillion, nine hundred and one " +
          "billion, two hundred and thirty-four million, five hundred and " +
          "sixty-seven thousand, eight hundred and ninety",
        "one, two, three, four, five, six, seven, eight, nine, zero, one, " +
          "two, three, four, five, six, seven, eight, nine, zero",
        "twelve, thirty-four, fifty-six, seventy-eight, ninety, twelve, " +
          "thirty-four, fifty-six, seventy-eight, ninety",
        "twelve, three forty-five, six seventy-eight, nine zero one, two thirty-four, five " +
          "sixty-seven, eight ninety",
        "twelve quintillion, three hundred and forty-five quadrillion, " +
          "six hundred and seventy-eight trillion, nine hundred and one " +
          "billion, two hundred and thirty-four million, five hundred and " +
          "sixty-seven thousand, eight hundred and ninetieth"
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
        "9.87654",
        "nine point eight seven six five four",
        "nine, point, eight, seven, six, five, four",
        "nine, point, eight, seventy-six, fifty-four",
        "nine, point, eighty-seven, six fifty-four",
        "ninth point eight seven six five four",
        "nine point eight seven six five fourth"
      ],
      [
        "98.7654",
        "ninety-eight point seven six five four",
        "nine, eight, point, seven, six, five, four",
        "ninety-eight, point, seventy-six, fifty-four",
        "ninety-eight, point, seven, six fifty-four",
        "ninety-eighth point seven six five four",
        "ninety-eight point seven six five fourth"
      ],
      [
        "987.654",
        "nine hundred and eighty-seven point six five four",
        "nine, eight, seven, point, six, five, four",
        "nine, eighty-seven, point, six, fifty-four",
        "nine eighty-seven, point, six fifty-four",
        "nine hundred and eighty-seventh point six five four",
        "nine hundred and eighty-seven point six five fourth"
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
        "98765.4",
        "ninety-eight thousand, seven hundred and sixty-five point four",
        "nine, eight, seven, six, five, point, four",
        "nine, eighty-seven, sixty-five, point, four",
        "ninety-eight, seven sixty-five, point, four",
        "ninety-eight thousand, seven hundred and sixty-fifth point four",
        "ninety-eight thousand, seven hundred and sixty-five point fourth"
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

    // upstream helper `go(p, i)`
    const go = (i: ReadonlyArray<string>) =>
      Effect.gen(function* () {
        const input = i[0] ?? ""
        expect(yield* numberToWords(input), `${input}`).toBe(i[1] ?? "")
        expect(yield* numberToWords(input, { group: 1 }), `${input} group=1`).toBe(i[2] ?? "")
        expect(yield* numberToWords(input, { group: 2 }), `${input} group=2`).toBe(i[3] ?? "")
        expect(yield* numberToWords(input, { group: 3 }), `${input} group=3`).toBe(i[4] ?? "")
        if (i.length > 5) {
          expect(yield* numberToWords(yield* ordinal(input)), `words(ordinal(${input}))`).toBe(
            i[5] ?? ""
          )
        }
        if (i.length > 6) {
          expect(yield* ordinal(yield* numberToWords(input)), `ordinal(words(${input}))`).toBe(
            i[6] ?? ""
          )
        } else if (i.length > 5) {
          expect(yield* ordinal(yield* numberToWords(input)), `ordinal(words(${input}))`).toBe(
            i[5] ?? ""
          )
        }
      })

    await runInflector(
      Effect.gen(function* () {
        for (const i of nw) {
          yield* go(i)
        }
      })
    )
  })

  test("test_number_to_currency_rounds_half_up", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(yield* numberToCurrency(2.675)).toBe("two and 68/100")
        expect(yield* numberToCurrency(2.674)).toBe("two and 67/100")
        // diverges: JavaScript has no Decimal type; Decimal("0.995") is passed as the string "0.995"
        expect(yield* numberToCurrency("0.995")).toBe("one and 00/100")
      })
    )
  })
})
