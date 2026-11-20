import { describe, expect, test } from "bun:test"
import { Effect, Exit } from "effect"
import { BadNumValueError, getState, inflect, InflectTemplateError, num, plural } from "inflectionts"
import { runInflector, runInflectorExit } from "./helpers.ts"

describe("inflect template interpolation", () => {
  test("interpolates all supported methods, keyword args, tuples, lists, constants, and signed numbers", async () => {
    await runInflector(
      Effect.gen(function* () {
        const cases: ReadonlyArray<readonly [string, string]> = [
          ["num(1)", "1"],
          ["num(1,0)", ""],
          ["num(1,1)", "1"],
          ["num(1)   ", "1   "],
          ["   num(1)   ", "   1   "],
          ["num(3) num(1)", "3 1"],
          ["plural('rock')", "rocks"],
          ["plural('rock')  plural('child')", "rocks  children"],
          ["num(2) plural('rock')  plural('child')", "2 rocks  children"],
          [
            "plural('rock') plural_noun('rock') plural_verb('rocks') plural_adj('big') a('ant')",
            "rocks rocks rock big an ant"
          ],
          [
            "an('rock') no('cat') ordinal(3) number_to_words(1234) present_participle('runs')",
            "a rock no cats 3rd one thousand, two hundred and thirty-four running"
          ],
          ["a('cat',0) a('cat',1) a('cat',2) a('cat', 2)", "0 cat a cat 2 cat 2 cat"],
          ["The plural of car is plural('car')", "The plural of car is cars"],
          ["The singular of car is singular_noun('car')", "The singular of car is car"],
          ["I saw 3 plural('cat',3)", "I saw 3 cats"],
          ["plural('I',1) plural_verb('saw',1) plural('a',2) plural_noun('saw',2)", "I saw some saws"],
          ["num(1, False)plural('I') plural_verb('saw') num(1, False)plural('a') plural_noun('saw')", "I saw a saw"],
          [
            "num(2, False)plural('I') plural_verb('saw') num(2, False)plural('a') plural_noun('saw')",
            "we saw some saws"
          ],
          ["There plural_verb('was',2) no('error',2)", "There were 2 errors"],
          ["There num(2, False)plural_verb('was') no('error')", "There were 2 errors"],
          ["Did you want a('thing') or an('idea')", "Did you want a thing or an idea"],
          ["It was ordinal('2') from the left", "It was 2nd from the left"],
          // Tuples & lists
          ["plural('egg', ('a', 'b', 'c'))", "eggs"],
          ["plural('egg', ['a', 'b', 'c'])", "eggs"],
          ["plural_noun('egg', ('a', 'b', 'c'))", "eggs"],
          ["plural_adj('a', ('a', 'b', 'c'))", "some"],
          ["plural_verb('was', ('a', 'b', 'c'))", "were"],
          ["singular_noun('eggs', ('a', 'b', 'c'))", "eggs"],
          ["an('error', ('a', 'b', 'c'))", "('a', 'b', 'c') error"],
          ["This is not a function(name)", "This is not a function(name)"],
          // Builtin constants
          ["Plural of False is plural('False')", "Plural of False is Falses"],
          ["num(10, False) plural('False')", " Falses"],
          ["plural('True')", "Trues"],
          ["num(10, True) plural('False')", "10 Falses"],
          ["plural('None')", "Nones"],
          ["num(10, None) plural('True')", "10 Trues"],
          // Keyword args
          ["number_to_words(1234, andword='')", "one thousand, two hundred thirty-four"],
          ["number_to_words(1234, andword='plus')", "one thousand, two hundred plus thirty-four"],
          ["number_to_words('555_1202', group=1, zero='oh')", "five, five, five, one, two, oh, two"],
          // Signed numbers
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

        for (const [template, expected] of cases) {
          expect(yield* inflect(template), template).toBe(expected)
        }
      })
    )
  })

  test("restores persistentCount after both success and errors", async () => {
    for (const initial of [null, 1, 2]) {
      await runInflector(
        Effect.gen(function* () {
          yield* num(initial)
          const expectedPlural = yield* plural("cat")

          expect(yield* inflect("num(1, 0)plural('cat')")).toBe("cat")
          expect((yield* getState).persistentCount).toBe(initial)
          expect(yield* plural("cat")).toBe(expectedPlural)

          const err1 = yield* Effect.exit(inflect("num(3) num(1) num('invalid')"))
          expect(Exit.isFailure(err1)).toBe(true)
          if (Exit.isFailure(err1) && err1.cause.reasons[0]?._tag === "Fail") {
            expect(err1.cause.reasons[0].error).toBeInstanceOf(BadNumValueError)
          }
          expect((yield* getState).persistentCount).toBe(initial)
          expect(yield* plural("cat")).toBe(expectedPlural)

          const err2 = yield* Effect.exit(inflect("num(3) num(1) plural(missing_word)"))
          expect(Exit.isFailure(err2)).toBe(true)
          if (Exit.isFailure(err2) && err2.cause.reasons[0]?._tag === "Fail") {
            expect(err2.cause.reasons[0].error).toBeInstanceOf(InflectTemplateError)
          }
          expect((yield* getState).persistentCount).toBe(initial)

          const err3 = yield* Effect.exit(inflect("num(3) num(1) plural('cat', @)"))
          expect(Exit.isFailure(err3)).toBe(true)
          if (Exit.isFailure(err3) && err3.cause.reasons[0]?._tag === "Fail") {
            expect(err3.cause.reasons[0].error).toBeInstanceOf(InflectTemplateError)
          }
          expect((yield* getState).persistentCount).toBe(initial)
        })
      )
    }
  })

  test("rejects non-literal expressions and undefined names", async () => {
    for (const expr of [
      "number_to_words(-missing)",
      "number_to_words(-'2')",
      "number_to_words(--2)",
      "number_to_words(~2)",
      "number_to_words(1 + 2)",
      "plural(two)"
    ]) {
      const exit = await runInflectorExit(inflect(expr))
      expect(Exit.isFailure(exit), expr).toBe(true)
      if (Exit.isFailure(exit) && exit.cause.reasons[0]?._tag === "Fail") {
        expect(exit.cause.reasons[0].error).toBeInstanceOf(InflectTemplateError)
      }
    }
  })
})
