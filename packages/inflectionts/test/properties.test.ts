import { describe, test } from "bun:test"
import { Arbitrary, Effect, Schema } from "effect"
import {
  a,
  compare,
  defaultClassical,
  getState,
  inflect,
  join,
  no,
  num,
  numberToCurrency,
  numberToWords,
  ordinal,
  plural,
  pluralAdj,
  pluralNoun,
  pluralVerb
} from "inflectionts"
import { checkInflectorProperty } from "./helpers.ts"

const AlphaWord = Schema.String.check(Schema.isPattern(/^[a-z]{1,12}$/))
const Padding = Schema.String.check(Schema.isPattern(/^ {0,3}$/))
const BoundedInt = Schema.Int.check(Schema.isBetween({ minimum: -100_000, maximum: 100_000 }))
const NonNegSmallInt = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 500 }))
const NonEmptyWordArray = Schema.Array(AlphaWord).check(Schema.isMinLength(1), Schema.isMaxLength(6))

describe("Effect Arbitrary property tests", () => {
  test("plural/a/no preserve leading and trailing spaces", async () => {
    const arb = Arbitrary.schema(Schema.Tuple([Padding, AlphaWord, Padding]))
    await checkInflectorProperty(
      arb,
      ([pre, word, post]) =>
        Effect.gen(function* () {
          const padded = `${pre}${word}${post}`
          const pAll = yield* plural(padded)
          const pNoun = yield* pluralNoun(padded)
          const pVerb = yield* pluralVerb(padded)
          const pAdj = yield* pluralAdj(padded)
          const art = yield* a(padded)
          const noStr = yield* no(padded, 0)
          return (
            pAll.startsWith(pre) &&
            pAll.endsWith(post) &&
            pNoun.startsWith(pre) &&
            pNoun.endsWith(post) &&
            pVerb.startsWith(pre) &&
            pVerb.endsWith(post) &&
            pAdj.startsWith(pre) &&
            pAdj.endsWith(post) &&
            art.startsWith(pre) &&
            art.endsWith(post) &&
            noStr.startsWith(pre) &&
            noStr.endsWith(post)
          )
        }),
      { runs: 80, seed: 42 }
    )
  })

  test("compare is reflexive, symmetric on singular/plural, and preserves classical state", async () => {
    const arb = Arbitrary.schema(AlphaWord)
    await checkInflectorProperty(
      arb,
      (word) =>
        Effect.gen(function* () {
          const selfCmp = yield* compare(word, word)
          const plur = yield* pluralNoun(word, 2)
          const fwd = yield* compare(word, plur)
          const rev = yield* compare(plur, word)
          const state = yield* getState

          const classicalUnchanged =
            state.classical.all === defaultClassical.all &&
            state.classical.zero === defaultClassical.zero &&
            state.classical.herd === defaultClassical.herd &&
            state.classical.names === defaultClassical.names &&
            state.classical.persons === defaultClassical.persons &&
            state.classical.ancient === defaultClassical.ancient

          const symmetric =
            (fwd._tag === "Equal" && rev._tag === "Equal") ||
            (fwd._tag === "SingularPlural" && rev._tag === "PluralSingular") ||
            (fwd._tag === "PluralSingular" && rev._tag === "SingularPlural") ||
            (fwd._tag === "PluralPlural" && rev._tag === "PluralPlural")

          return selfCmp._tag === "Equal" && symmetric && classicalUnchanged
        }),
      { runs: 80, seed: 101 }
    )
  })

  test("ordinal suffix obeys English last-two-digit rule for all integers", async () => {
    const arb = Arbitrary.schema(BoundedInt)
    await checkInflectorProperty(
      arb,
      (n) =>
        Effect.gen(function* () {
          const result = yield* ordinal(n)
          const abs = Math.abs(n)
          const mod100 = abs % 100
          const mod10 = abs % 10
          const expectedSuffix =
            mod100 === 11 || mod100 === 12 || mod100 === 13
              ? "th"
              : mod10 === 1
                ? "st"
                : mod10 === 2
                  ? "nd"
                  : mod10 === 3
                    ? "rd"
                    : "th"
          return result === `${n}${expectedSuffix}`
        }),
      { runs: 100, seed: 202 }
    )
  })

  test("numberToWords respects threshold boundary", async () => {
    const arb = Arbitrary.schema(Schema.Tuple([NonNegSmallInt, NonNegSmallInt]))
    await checkInflectorProperty(
      arb,
      ([n, threshold]) =>
        Effect.gen(function* () {
          const withThreshold = yield* numberToWords(n, { threshold })
          if (n <= threshold) {
            const words = yield* numberToWords(n)
            return withThreshold === words
          }
          return withThreshold === String(n)
        }),
      { runs: 80, seed: 303 }
    )
  })

  test("numberToCurrency always formats exact cents fraction", async () => {
    const arb = Arbitrary.schema(
      Schema.Tuple([NonNegSmallInt, Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 99 }))])
    )
    await checkInflectorProperty(
      arb,
      ([dollars, cents]) =>
        Effect.gen(function* () {
          const centsStr = String(cents).padStart(2, "0")
          const result = yield* numberToCurrency(`${dollars}.${centsStr}`)
          const words = yield* numberToWords(dollars)
          return result === `${words} and ${centsStr}/100`
        }),
      { runs: 80, seed: 404 }
    )
  })

  test("inflect template never leaks persistentCount mutations", async () => {
    const arb = Arbitrary.schema(Schema.Tuple([NonNegSmallInt, NonNegSmallInt]))
    await checkInflectorProperty(
      arb,
      ([initial, inner]) =>
        Effect.gen(function* () {
          yield* num(initial)
          yield* inflect(`num(${inner}, False)plural('cat')`)
          const state = yield* getState
          return state.persistentCount === initial
        }),
      { runs: 60, seed: 505 }
    )
  })

  test("join preserves every input word in order", async () => {
    const arb = Arbitrary.schema(NonEmptyWordArray)
    await checkInflectorProperty(
      arb,
      (words) =>
        Effect.gen(function* () {
          const joined = yield* join(words)
          let offset = 0
          for (const word of words) {
            const idx = joined.indexOf(word, offset)
            if (idx === -1) {
              return false
            }
            offset = idx + word.length
          }
          return true
        }),
      { runs: 80, seed: 606 }
    )
  })
})
