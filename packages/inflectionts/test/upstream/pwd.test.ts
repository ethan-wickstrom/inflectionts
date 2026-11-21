import { describe, expect, test } from "bun:test"

import {
  a,
  allClassical,
  an,
  BadChunkingOptionError,
  BadGenderError,
  BadNumValueError,
  BadUserDefinedPatternError,
  classical,
  compare,
  compareAdjs,
  compareNouns,
  compareVerbs,
  comparisonCode,
  defa,
  defadj,
  defan,
  defaultClassical,
  defnoun,
  defverb,
  gender,
  getState,
  inflect,
  Inflector,
  InflectTemplateError,
  InvalidWordError,
  join,
  no,
  noClassical,
  num,
  numberToWords,
  numberToWordsList,
  ordinal,
  plural,
  pluralAdj,
  pluralNoun,
  pluralVerb,
  presentParticiple,
  singularNoun,
  UnknownClassicalModeError,
  type ComparisonCode,
  type ComparisonResult,
  type CountInput,
  type InflectError,
  type NumberToWordsOptions
} from "@ethan-wickstrom/inflectionts"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"

import { udMatch } from "#internal/helpers"

import { runInflector } from "../helpers.ts"

// Port of jaraco/inflect tests/test_pwd.py (all functions are methods of `class Test`).
//
// Port conventions: Python `False`/`None` results map to `Option.none()` (singularNoun),
// `undefined` (comparisonCode for an unequal comparison, udMatch without a match) or `null`
// (persistentCount); pytest `xfail` maps to `test.failing`.
//
// Covered elsewhere (not duplicated here):
// - test_enclose, test_joinstem, test_postprocess, test_partition_word,
//   test_defnoun_case_normalize_discards_preservation, test_plural_phrase_changing_word_count,
//   test_compare_preserves_classical_mode: test/plurals.test.ts
// - test_inflect, test_inflect_restores_count_after_success: test/inflect-template.test.ts
//
// Not applicable (see PARITY.md): test__pl_reg_plurals, test__pl_check_plurals_N,
// test__pl_check_plurals_adj, test_count, test__plnoun, test_plnoun_retains_case,
// test__pl_special_verb, test__pl_general_verb, test__pl_special_adjective, test_millfn,
// test_unitfn, test_tenfn, test_hundfn, test_enword, test_enword_number_args_override,
// test_unknown_method.

const code = (result: Effect.Effect<ComparisonResult, InflectError, Inflector>) =>
  Effect.map(result, comparisonCode)

describe("test_pwd.py", () => {
  test("test_classical", async () => {
    // classical dicts
    expect(new Set(Object.keys(defaultClassical))).toEqual(new Set(Object.keys(allClassical)))
    expect(new Set(Object.keys(defaultClassical))).toEqual(new Set(Object.keys(noClassical)))

    await runInflector(
      Effect.gen(function* () {
        // def classical
        expect((yield* getState).classical).toEqual(defaultClassical)

        yield* classical()
        expect((yield* getState).classical).toEqual(allClassical)

        // p.classical(0), p.classical(1), p.classical("names"), p.classical("names", "zero")
        // and p.classical("all") raise TypeError upstream; positional arguments are rejected
        // at compile time by the TypeScript signature, so they are not ported (see PARITY.md).

        yield* classical({ all: false })
        expect((yield* getState).classical).toEqual(noClassical)

        yield* classical({ names: true, zero: true })
        expect((yield* getState).classical).toEqual({
          ...defaultClassical,
          names: true,
          zero: true
        })

        yield* classical({ all: true })
        expect((yield* getState).classical).toEqual(allClassical)

        yield* classical({ all: false })
        yield* classical({ names: true, zero: true })
        expect((yield* getState).classical).toEqual({
          ...defaultClassical,
          names: true,
          zero: true
        })

        yield* classical({ all: false })
        yield* classical({ names: true, zero: false })
        expect((yield* getState).classical).toEqual({
          ...defaultClassical,
          names: true,
          zero: false
        })

        // diverges: typed Effect failure instead of a raised Python exception
        expect(yield* Effect.flip(classical({ bogus: true }))).toBeInstanceOf(
          UnknownClassicalModeError
        )
      })
    )
  })

  test("test_num", async () => {
    await runInflector(
      Effect.gen(function* () {
        // def num
        expect((yield* getState).persistentCount).toBeNull()

        yield* num()
        expect((yield* getState).persistentCount).toBeNull()

        let ret = yield* num(3)
        expect((yield* getState).persistentCount).toBe(3)
        expect(ret).toBe("3")

        yield* num()
        ret = yield* num("3")
        expect((yield* getState).persistentCount).toBe(3)
        expect(ret).toBe("3")

        yield* num()
        ret = yield* num(3, 1)
        expect((yield* getState).persistentCount).toBe(3)
        expect(ret).toBe("3")

        yield* num()
        ret = yield* num(3, 0)
        expect((yield* getState).persistentCount).toBe(3)
        expect(ret).toBe("")

        // diverges: typed Effect failure instead of a raised Python exception
        expect(yield* Effect.flip(num("text"))).toBeInstanceOf(BadNumValueError)

        // diverges: typed Effect failure instead of a raised Python exception
        expect(yield* Effect.flip(num(Number.POSITIVE_INFINITY))).toBeInstanceOf(BadNumValueError)
      })
    )
  })

  test("test_uppercase_noun_can_keep_custom_plural_case", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(yield* plural("URL", 2)).toBe("URLS")
        yield* defnoun("URL", "URLs", { case: "preserve" })
        expect(yield* plural("URL", 2)).toBe("URLs")
        expect(yield* pluralNoun("URL", 2)).toBe("URLs")
        expect(yield* plural("URL", 1)).toBe("URL")
        yield* defnoun("ID", "IDs", { case: "preserve" })
        expect(yield* plural("ID", 2)).toBe("IDs")
      })
    )
    // preservation is confined to the engine that registered it
    expect(await runInflector(plural("URL", 2))).toBe("URLS")
  })

  test("test_pronoun_I_case_preserved_by_default", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect((yield* getState).preserveCase.has("I")).toBe(true)
        expect(yield* plural("I", 2)).toBe("we")
      })
    )
  })

  test("test_inflect_restores_count_after_error", async () => {
    const expressions: ReadonlyArray<
      readonly [string, typeof BadNumValueError | typeof InflectTemplateError]
    > = [
      ["num('invalid')", BadNumValueError],
      // diverges: InflectTemplateError typed failure instead of Python's NameError
      ["plural(missing_word)", InflectTemplateError],
      // diverges: InflectTemplateError typed failure instead of Python's SyntaxError
      ["plural('cat', @)", InflectTemplateError]
    ]
    for (const count of [null, 1, 2]) {
      for (const [expression, error] of expressions) {
        await runInflector(
          Effect.gen(function* () {
            yield* num(count)
            const expected = yield* plural("cat")

            // diverges: typed Effect failure instead of a raised Python exception
            expect(yield* Effect.flip(inflect(`num(3) num(1) ${expression}`))).toBeInstanceOf(error)

            expect((yield* getState).persistentCount).toBe(count)
            expect(yield* plural("cat")).toBe(expected)
          })
        )
      }
    }
  })

  test("test_user_input_fns", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect((yield* getState).plSbUserDefined).toEqual([])
        yield* defnoun("VAX", "VAXen")
        expect(yield* plural("VAX")).toBe("VAXEN")
        // diverges: rules are stored as {pattern, replacement} entries, not a flat [s, p] list
        expect((yield* getState).plSbUserDefined).toEqual([
          { pattern: "VAX", replacement: "VAXen" }
        ])

        expect(udMatch("word", (yield* getState).plSbUserDefined)).toBeUndefined()
        expect(udMatch("VAX", (yield* getState).plSbUserDefined)).toBe("VAXen")
        expect(udMatch("VVAX", (yield* getState).plSbUserDefined)).toBeUndefined()

        yield* defnoun("cow", "cows|kine")
        expect(yield* plural("cow")).toBe("cows")
        yield* classical()
        expect(yield* plural("cow")).toBe("kine")

        expect(udMatch("cow", (yield* getState).plSbUserDefined)).toBe("cows|kine")

        yield* defnoun("(.+i)o", "$1i")
        expect(yield* plural("studio")).toBe("studii")
        expect(udMatch("studio", (yield* getState).plSbUserDefined)).toBe("studii")

        yield* defnoun("aviatrix", "aviatrices")
        expect(yield* plural("aviatrix")).toBe("aviatrices")
        expect(udMatch("aviatrix", (yield* getState).plSbUserDefined)).toBe("aviatrices")
        yield* defnoun("aviatrix", "aviatrixes")
        expect(yield* plural("aviatrix")).toBe("aviatrixes")
        expect(udMatch("aviatrix", (yield* getState).plSbUserDefined)).toBe("aviatrixes")
        yield* defnoun("aviatrix", null)
        expect(yield* plural("aviatrix")).toBe("aviatrices")
        expect(udMatch("aviatrix", (yield* getState).plSbUserDefined)).toBeUndefined()

        yield* defnoun("(cat)", "$1s")
        expect(yield* plural("cat")).toBe("cats")

        // diverges: typed Effect failure instead of a raised Python exception
        expect(yield* Effect.flip(defnoun("(??", null))).toBeInstanceOf(BadUserDefinedPatternError)

        yield* defnoun(null, "any") // check None doesn't crash it

        // defadj
        yield* defadj("hir", "their")
        expect(yield* plural("hir")).toBe("their")
        expect(udMatch("hir", (yield* getState).plAdjUserDefined)).toBe("their")

        // defa defan
        yield* defa("h")
        expect(yield* a("h")).toBe("a h")
        expect(udMatch("h", (yield* getState).articleUserDefined)).toBe("a")

        yield* defan("horrendous.*")
        expect(yield* a("horrendously")).toBe("an horrendously")
        expect(udMatch("horrendously", (yield* getState).articleUserDefined)).toBe("an")
      })
    )
  })

  test("test_user_input_defverb", async () => {
    await runInflector(
      Effect.gen(function* () {
        yield* defverb("will", "shall", "will", "will", "will", "will")
        expect(udMatch("will", (yield* getState).plVUserDefined)).toBe("will")
        expect(yield* plural("will")).toBe("will")
      })
    )
  })

  test.failing("test_user_input_defverb_compare (xfail: todo)", async () => {
    await runInflector(
      Effect.gen(function* () {
        yield* defverb("will", "shall", "will", "will", "will", "will")
        expect(yield* code(compare("will", "shall"))).toBe("s:p")
        expect(yield* code(compareVerbs("will", "shall"))).toBe("s:p")
      })
    )
  })

  test("test_pl", async () => {
    await runInflector(
      Effect.gen(function* () {
        const fns = { plural, pluralNoun, pluralVerb, pluralAdj }
        const cases: ReadonlyArray<readonly [keyof typeof fns, string, string]> = [
          ["plural", "cow", "cows"],
          ["plural", "thought", "thoughts"],
          ["plural", "mouse", "mice"],
          ["plural", "knife", "knives"],
          ["plural", "knifes", "knife"],
          ["plural", " cat  ", " cats  "],
          ["plural", "court martial", "courts martial"],
          ["plural", "a", "some"],
          ["plural", "carmen", "carmina"],
          ["plural", "quartz", "quartzes"],
          ["plural", "care", "cares"],
          ["pluralNoun", "cow", "cows"],
          ["pluralNoun", "thought", "thoughts"],
          ["pluralNoun", "snooze", "snoozes"],
          ["pluralVerb", "runs", "run"],
          ["pluralVerb", "thought", "thought"],
          ["pluralVerb", "eyes", "eye"],
          ["pluralAdj", "a", "some"],
          ["pluralAdj", "this", "these"],
          ["pluralAdj", "that", "those"],
          ["pluralAdj", "my", "our"],
          ["pluralAdj", "cat's", "cats'"],
          ["pluralAdj", "child's", "children's"]
        ]
        for (const [fn, sing, plur] of cases) {
          expect(yield* fns[fn](sing), `${fn}("${sing}")`).toBe(plur)
        }

        const counted: ReadonlyArray<readonly [string, CountInput, string]> = [
          ["cow", 1, "cow"],
          ["cow", 2, "cows"],
          ["cow", "one", "cow"],
          ["cow", "each", "cow"],
          ["cow", "two", "cows"],
          ["cow", 0, "cows"],
          ["cow", "zero", "cows"],
          ["runs", 0, "run"],
          ["runs", 1, "runs"],
          ["am", 0, "are"]
        ]
        for (const [sing, count, plur] of counted) {
          expect(yield* plural(sing, count), `plural("${sing}", ${String(count)})`).toBe(plur)
        }

        yield* classical({ zero: true })
        expect(yield* plural("cow", 0)).toBe("cow")
        expect(yield* plural("cow", "zero")).toBe("cow")
        expect(yield* plural("runs", 0)).toBe("runs")
        expect(yield* plural("am", 0)).toBe("am")
        expect(yield* pluralVerb("runs", 1)).toBe("runs")

        expect(yield* plural("die")).toBe("dice")
        expect(yield* pluralNoun("die")).toBe("dice")

        // diverges: InvalidWordError typed failure instead of typeguard's TypeCheckError
        expect(yield* Effect.flip(plural(""))).toBeInstanceOf(InvalidWordError)
        // diverges: InvalidWordError typed failure instead of typeguard's TypeCheckError
        expect(yield* Effect.flip(pluralNoun(""))).toBeInstanceOf(InvalidWordError)
        // diverges: InvalidWordError typed failure instead of typeguard's TypeCheckError
        expect(yield* Effect.flip(pluralVerb(""))).toBeInstanceOf(InvalidWordError)
        // diverges: InvalidWordError typed failure instead of typeguard's TypeCheckError
        expect(yield* Effect.flip(pluralAdj(""))).toBeInstanceOf(InvalidWordError)
      })
    )
  })

  test("test_sinoun", async () => {
    await runInflector(
      Effect.gen(function* () {
        for (const [sing, plur] of [
          ["cat", "cats"],
          ["die", "dice"],
          ["goose", "geese"]
        ] as const) {
          expect(Option.getOrUndefined(yield* singularNoun(plur))).toBe(sing)
          expect(yield* inflect(`singular_noun('${plur}')`)).toBe(sing)
        }

        expect(Option.getOrUndefined(yield* singularNoun("cats", 2))).toBe("cats")
        expect(Option.getOrUndefined(yield* singularNoun("open valves", 2))).toBe("open valves")

        expect(Option.getOrUndefined(yield* singularNoun("zombies"))).toBe("zombie")

        expect(Option.getOrUndefined(yield* singularNoun("shoes"))).toBe("shoe")
        expect(Option.getOrUndefined(yield* singularNoun("dancing shoes"))).toBe("dancing shoe")

        expect(Option.getOrUndefined(yield* singularNoun("Matisses"))).toBe("Matisse")
        expect(Option.getOrUndefined(yield* singularNoun("bouillabaisses"))).toBe("bouillabaisse")

        expect(Option.getOrUndefined(yield* singularNoun("quartzes"))).toBe("quartz")

        expect(Option.getOrUndefined(yield* singularNoun("Nietzsches"))).toBe("Nietzsche")
        expect(Option.getOrUndefined(yield* singularNoun("aches"))).toBe("ache")

        expect(Option.getOrUndefined(yield* singularNoun("Clives"))).toBe("Clive")
        expect(Option.getOrUndefined(yield* singularNoun("weaves"))).toBe("weave")

        expect(Option.isNone(yield* singularNoun("status"))).toBe(true)
        expect(Option.isNone(yield* singularNoun("hiatus"))).toBe(true)
      })
    )
  })

  test("test_gender", async () => {
    await runInflector(
      Effect.gen(function* () {
        const check = (pairs: ReadonlyArray<readonly [string, string]>) =>
          Effect.gen(function* () {
            for (const [sing, plur] of pairs) {
              expect(
                Option.getOrUndefined(yield* singularNoun(plur)),
                `singular_noun(${plur})`
              ).toBe(sing)
              expect(yield* inflect(`singular_noun('${plur}')`)).toBe(sing)
            }
          })

        yield* gender("feminine")
        yield* check([
          ["she", "they"],
          ["herself", "themselves"],
          ["hers", "theirs"],
          ["to her", "to them"],
          ["to herself", "to themselves"]
        ])

        yield* gender("masculine")
        yield* check([
          ["he", "they"],
          ["himself", "themselves"],
          ["his", "theirs"],
          ["to him", "to them"],
          ["to himself", "to themselves"]
        ])

        yield* gender("gender-neutral")
        yield* check([
          ["they", "they"],
          ["themself", "themselves"],
          ["theirs", "theirs"],
          ["to them", "to them"],
          ["to themself", "to themselves"]
        ])

        yield* gender("neuter")
        yield* check([
          ["it", "they"],
          ["itself", "themselves"],
          ["its", "theirs"],
          ["to it", "to them"],
          ["to itself", "to themselves"]
        ])

        // diverges: typed Effect failure instead of a raised Python exception
        expect(yield* Effect.flip(gender("male"))).toBeInstanceOf(BadGenderError)

        const withGender: ReadonlyArray<readonly [string, string, string]> = [
          ["it", "they", "neuter"],
          ["she", "they", "feminine"],
          ["he", "they", "masculine"],
          ["they", "they", "gender-neutral"],
          ["she or he", "they", "feminine or masculine"],
          ["he or she", "they", "masculine or feminine"]
        ]
        for (const [sing, plur, gen] of withGender) {
          expect(Option.getOrUndefined(yield* singularNoun(plur, undefined, gen))).toBe(sing)
        }

        // diverges: typed Effect failure instead of a raised Python exception
        expect(
          yield* Effect.flip(singularNoun("cats", undefined, "unknown gender"))
        ).toBeInstanceOf(BadGenderError)
      })
    )
  })

  test("test_compare_simple", async () => {
    const params: ReadonlyArray<readonly [string, string, ComparisonCode | undefined]> = [
      ["index", "index", "eq"],
      ["index", "indexes", "s:p"],
      ["index", "indices", "s:p"],
      ["indexes", "index", "p:s"],
      ["indices", "index", "p:s"],
      ["indices", "indexes", "p:p"],
      ["indexes", "indices", "p:p"],
      ["indices", "indices", "eq"],
      ["inverted index", "inverted indices", "s:p"],
      ["inverted indices", "inverted index", "p:s"],
      ["inverted indexes", "inverted indices", "p:p"],
      ["opuses", "opera", "p:p"],
      ["opera", "opuses", "p:p"],
      ["brothers", "brethren", "p:p"],
      ["cats", "cats", "eq"],
      ["base", "basis", undefined],
      ["syrinx", "syringe", undefined],
      ["she", "he", undefined],
      ["opus", "operas", undefined],
      ["taxi", "taxes", undefined],
      ["time", "Times", undefined],
      ["time".toLowerCase(), "Times".toLowerCase(), "s:p"],
      ["courts martial", "court martial", "p:s"],
      ["my", "my", "eq"],
      ["my", "our", "s:p"],
      ["our", "our", "eq"]
    ]
    for (const [sing, plur, res] of params) {
      expect(await runInflector(code(compare(sing, plur))), `compare(${sing}, ${plur})`).toBe(res)
    }
  })

  test.failing("test_compare_simple[dresses's-dresses'-p:p] (xfail: todo)", async () => {
    expect(await runInflector(code(compare("dresses's", "dresses'")))).toBe("p:p")
  })

  // upstream expects the non-existent code "s:s"; no comparisonCode can equal it
  test.failing("test_compare_simple[dress's-dress'-s:s] (xfail: todo)", async () => {
    expect<string | undefined>(await runInflector(code(compare("dress's", "dress'")))).toBe("s:s")
  })

  test.failing("test_compare_simple[Jess's-Jess'-s:s] (xfail: todo)", async () => {
    expect<string | undefined>(await runInflector(code(compare("Jess's", "Jess'")))).toBe("s:s")
  })

  test("test_compare_nouns", async () => {
    const params: ReadonlyArray<readonly [string, string, ComparisonCode]> = [
      ["index", "index", "eq"],
      ["index", "indexes", "s:p"],
      ["index", "indices", "s:p"],
      ["indexes", "index", "p:s"],
      ["indices", "index", "p:s"],
      ["indices", "indexes", "p:p"],
      ["indexes", "indices", "p:p"],
      ["indices", "indices", "eq"],
      ["inverted index", "inverted indices", "s:p"],
      ["inverted indices", "inverted index", "p:s"],
      ["inverted indexes", "inverted indices", "p:p"]
    ]
    for (const [sing, plur, res] of params) {
      expect(
        await runInflector(code(compareNouns(sing, plur))),
        `compare_nouns(${sing}, ${plur})`
      ).toBe(res)
    }
  })

  test("test_compare_verbs", async () => {
    const params: ReadonlyArray<readonly [string, string, ComparisonCode]> = [
      ["runs", "runs", "eq"],
      ["runs", "run", "s:p"],
      ["run", "run", "eq"]
    ]
    for (const [sing, plur, res] of params) {
      expect(
        await runInflector(code(compareVerbs(sing, plur))),
        `compare_verbs(${sing}, ${plur})`
      ).toBe(res)
    }
  })

  test("test_compare_adjectives", async () => {
    const params: ReadonlyArray<readonly [string, string, ComparisonCode]> = [
      ["my", "my", "eq"],
      ["my", "our", "s:p"],
      ["our", "our", "eq"],
      ["indexes'", "indices'", "p:p"]
    ]
    for (const [sing, plur, res] of params) {
      expect(
        await runInflector(code(compareAdjs(sing, plur))),
        `compare_adjs(${sing}, ${plur})`
      ).toBe(res)
    }
  })

  test.failing("test_compare_adjectives[dresses's-dresses'-p:p] (xfail: todo)", async () => {
    expect(await runInflector(code(compareAdjs("dresses's", "dresses'")))).toBe("p:p")
  })

  test.failing("test_compare_adjectives[dress's-dress'-s:s] (xfail: todo)", async () => {
    expect<string | undefined>(await runInflector(code(compareAdjs("dress's", "dress'")))).toBe(
      "s:s"
    )
  })

  test.failing("test_compare_adjectives[Jess's-Jess'-s:s] (xfail: todo)", async () => {
    expect<string | undefined>(await runInflector(code(compareAdjs("Jess's", "Jess'")))).toBe("s:s")
  })

  test.failing("test_compare_your_our (xfail)", async () => {
    // multiple adjective plurals not (yet) supported
    await runInflector(
      Effect.gen(function* () {
        expect(yield* code(compare("your", "our"))).toBeUndefined()
        yield* defadj("my", "our|your") // what's ours is yours
        expect(yield* code(compare("your", "our"))).toBe("p:p")
      })
    )
  })

  test("test_classical_pl", async () => {
    await runInflector(
      Effect.gen(function* () {
        yield* classical()
        for (const [sing, plur] of [
          ["brother", "brethren"],
          ["dogma", "dogmata"]
        ] as const) {
          expect(yield* plural(sing)).toBe(plur)
        }
      })
    )
  })

  test("test_a", async () => {
    const params: ReadonlyArray<readonly [string, string]> = [
      ["cat", "a cat"],
      ["euphemism", "a euphemism"],
      ["Euler number", "an Euler number"],
      ["hour", "an hour"],
      ["houri", "a houri"],
      ["nth", "an nth"],
      ["rth", "an rth"],
      ["sth", "an sth"],
      ["xth", "an xth"],
      ["ant", "an ant"],
      ["book", "a book"],
      ["RSPCA", "an RSPCA"],
      ["SONAR", "a SONAR"],
      ["FJO", "a FJO"],
      ["FJ", "an FJ"],
      ["NASA", "a NASA"],
      ["UN", "a UN"],
      ["yak", "a yak"],
      ["yttrium", "an yttrium"],
      ["a elephant", "an elephant"],
      ["a giraffe", "a giraffe"],
      ["an ewe", "a ewe"],
      ["a orangutan", "an orangutan"],
      ["R.I.P.", "an R.I.P."],
      ["C.O.D.", "a C.O.D."],
      ["e-mail", "an e-mail"],
      ["X-ray", "an X-ray"],
      ["T-square", "a T-square"],
      ["LCD", "an LCD"],
      ["XML", "an XML"],
      ["YWCA", "a YWCA"],
      ["LED", "a LED"],
      ["OPEC", "an OPEC"],
      ["FAQ", "a FAQ"],
      ["UNESCO", "a UNESCO"],
      ["a", "an a"],
      ["an", "an an"],
      ["an ant", "an ant"],
      ["a cat", "a cat"],
      ["an cat", "a cat"],
      ["a ant", "an ant"]
    ]
    for (const [sing, plur] of params) {
      expect(await runInflector(a(sing)), `a("${sing}")`).toBe(plur)
    }
  })

  test("test_a_alt", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(yield* a("cat", 1)).toBe("a cat")
        expect(yield* a("cat", 2)).toBe("2 cat")

        // diverges: InvalidWordError typed failure instead of typeguard's TypeCheckError
        expect(yield* Effect.flip(a(""))).toBeInstanceOf(InvalidWordError)
      })
    )
  })

  test("test_a_and_an_same_method", async () => {
    expect(an).toBe(a)
    await runInflector(
      Effect.gen(function* () {
        const p = yield* Inflector
        expect(p.an).toBe(p.a)
      })
    )
  })

  test("test_no", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(yield* no("cat")).toBe("no cats")
        expect(yield* no("cat", 3)).toBe("3 cats")
        expect(yield* no("cat", "three")).toBe("three cats")
        expect(yield* no("cat", 1)).toBe("1 cat")
        expect(yield* no("cat", "one")).toBe("one cat")
        expect(yield* no("mouse")).toBe("no mice")
        yield* num(3)
        expect(yield* no("cat")).toBe("3 cats")
      })
    )
  })

  test("test_prespart", async () => {
    const params: ReadonlyArray<readonly [string, string]> = [
      ["runs", "running"],
      ["dies", "dying"],
      ["glues", "gluing"],
      ["eyes", "eying"],
      ["skis", "skiing"],
      ["names", "naming"],
      ["sees", "seeing"],
      ["hammers", "hammering"],
      ["bats", "batting"],
      ["eats", "eating"],
      ["loves", "loving"],
      ["spies", "spying"],
      ["hoes", "hoeing"],
      ["alibis", "alibiing"],
      ["is", "being"],
      ["are", "being"],
      ["had", "having"],
      ["has", "having"]
    ]
    for (const [sing, plur] of params) {
      expect(await runInflector(presentParticiple(sing)), `present_participle("${sing}")`).toBe(
        plur
      )
    }
  })

  test("test_ordinal", async () => {
    const params: ReadonlyArray<readonly [string, string]> = [
      ["1", "1st"],
      ["2", "2nd"],
      ["3", "3rd"],
      ["4", "4th"],
      ["10", "10th"],
      ["28", "28th"],
      ["100", "100th"],
      ["101", "101st"],
      ["1000", "1000th"],
      ["1001", "1001st"],
      ["0", "0th"],
      ["one", "first"],
      ["two", "second"],
      ["four", "fourth"],
      ["twenty", "twentieth"],
      ["one hundered", "one hunderedth"],
      ["one hundered and one", "one hundered and first"],
      ["zero", "zeroth"],
      ["n", "nth"] // bonus!
    ]
    for (const [n, ord] of params) {
      expect(await runInflector(ordinal(n)), `ordinal("${n}")`).toBe(ord)
    }
  })

  test("test_numwords", async () => {
    await runInflector(
      Effect.gen(function* () {
        const numwords = numberToWords

        for (const [n, word] of [
          ["1", "one"],
          ["10", "ten"],
          ["100", "one hundred"],
          ["1000", "one thousand"],
          ["10000", "ten thousand"],
          ["100000", "one hundred thousand"],
          ["1000000", "one million"],
          ["10000000", "ten million"],
          ["+10", "plus ten"],
          ["-10", "minus ten"],
          ["10.", "ten point"],
          [".10", "point one zero"]
        ] as const) {
          expect(yield* numwords(n), `numwords("${n}")`).toBe(word)
        }

        // TODO: should be one point two three
        for (const [n, word] of [
          ["1.23", "one point two three", "one point twenty-three"]
        ] as const) {
          expect(yield* numwords(n)).toBe(word)
        }

        for (const [n, txt] of [
          [3, "three bottles of beer on the wall"],
          [2, "two bottles of beer on the wall"],
          [1, "a solitary bottle of beer on the wall"],
          [0, "no more bottles of beer on the wall"]
        ] as const) {
          expect(
            `${yield* numwords(n, { one: "a solitary", zero: "no more" })}${yield* plural(" bottle of beer on the wall", n)}`
          ).toBe(txt)
        }

        expect(yield* numwords(0, { one: "one", zero: "zero" })).toBe("zero")

        expect(yield* numwords("1234")).toBe("one thousand, two hundred and thirty-four")
        expect(yield* numberToWordsList("1234")).toEqual([
          "one thousand",
          "two hundred and thirty-four"
        ])
        expect(yield* numberToWordsList("1234567")).toEqual([
          "one million",
          "two hundred and thirty-four thousand",
          "five hundred and sixty-seven"
        ])
        expect(yield* numberToWordsList("+10")).toEqual(["plus", "ten"])
        expect(yield* numwords("1234", { andword: "" })).toBe(
          "one thousand, two hundred thirty-four"
        )
        expect(yield* numwords("1234", { andword: "plus" })).toBe(
          "one thousand, two hundred plus thirty-four"
        )
        // #229: a punctuation andword must not leave a space before itself
        expect(yield* numwords(140, { andword: "," })).toBe("one hundred, forty")
        expect(yield* numwords(541140, { andword: "," })).toBe(
          "five hundred, forty-one thousand, one hundred, forty"
        )
        expect(yield* numwords(yield* ordinal("21"))).toBe("twenty-first")
        expect(yield* numwords("9", { threshold: 10 })).toBe("nine")
        expect(yield* numwords("10", { threshold: 10 })).toBe("ten")
        expect(yield* numwords("11", { threshold: 10 })).toBe("11")
        expect(yield* numwords("1000", { threshold: 10 })).toBe("1,000")
        expect(yield* numwords("123", { threshold: 10 })).toBe("123")
        expect(yield* numwords("1234", { threshold: 10 })).toBe("1,234")
        expect(yield* numwords("1234.5678", { threshold: 10 })).toBe("1,234.5678")
        expect(yield* numwords("1", { decimal: null })).toBe("one")
        expect(yield* numwords("1234.5678", { decimal: null })).toBe(
          "twelve million, three hundred and forty-five " +
            "thousand, six hundred and seventy-eight"
        )
      })
    )
  })

  test("test_numwords_group_chunking_error", async () => {
    await runInflector(
      Effect.gen(function* () {
        // diverges: typed Effect failure instead of a raised Python exception
        expect(yield* Effect.flip(numberToWords("1234", { group: 4 }))).toBeInstanceOf(
          BadChunkingOptionError
        )
      })
    )
  })

  test("test_numwords_group", async () => {
    const params: ReadonlyArray<readonly [string, NumberToWordsOptions, string]> = [
      ["12345", { group: 2 }, "one, twenty-three, forty-five"],
      ["123456", { group: 3 }, "one twenty-three, four fifty-six"],
      ["12345", { group: 1 }, "one, two, three, four, five"],
      ["1234th", { group: 0, andword: "and" }, "one thousand, two hundred and thirty-fourth"],
      ["1234th", { group: 0 }, "one thousand, two hundred and thirty-fourth"],
      ["120", { group: 2 }, "one, twenty"],
      ["120", { group: 2, zero: "oh", one: "unity" }, "one, twenty"],
      ["555_1202", { group: 1, zero: "oh" }, "five, five, five, one, two, oh, two"],
      ["555_1202", { group: 1, one: "unity" }, "five, five, five, unity, two, zero, two"],
      [
        "123.456",
        { group: 1, decimal: "mark", one: "one" },
        "one, two, three, mark, four, five, six"
      ]
    ]
    for (const [input, kwargs, expected] of params) {
      expect(
        await runInflector(numberToWords(input, kwargs)),
        `number_to_words("${input}", ${JSON.stringify(kwargs)})`
      ).toBe(expected)
    }
  })

  test.failing("test_numwords_group[12345-group=3] (xfail: 'hundred and' missing)", async () => {
    expect(await runInflector(numberToWords("12345", { group: 3 }))).toBe(
      "one hundred and twenty-three"
    )
  })

  test.failing(
    "test_numwords_group[101-group=2,zero=oh,one=unity] (xfail: ignoring 'one' param with group=2)",
    async () => {
      expect(await runInflector(numberToWords("101", { group: 2, zero: "oh", one: "unity" }))).toBe(
        "ten, unity"
      )
    }
  )

  test("test_wordlist", async () => {
    await runInflector(
      Effect.gen(function* () {
        const wordlist = join
        expect(yield* wordlist([])).toBe("")
        expect(yield* wordlist(["apple"])).toBe("apple")
        expect(yield* wordlist(["apple", "banana"])).toBe("apple and banana")
        expect(yield* wordlist(["apple", "banana", "carrot"])).toBe("apple, banana, and carrot")
        expect(yield* wordlist(["apple", "1,000", "carrot"])).toBe("apple; 1,000; and carrot")
        expect(yield* wordlist(["apple", "1,000", "carrot"], { sep: "," })).toBe(
          "apple, 1,000, and carrot"
        )
        expect(yield* wordlist(["apple", "banana", "carrot"], { finalSep: "" })).toBe(
          "apple, banana and carrot"
        )
        expect(yield* wordlist(["apple", "banana", "carrot"], { finalSep: ";" })).toBe(
          "apple, banana; and carrot"
        )
        expect(yield* wordlist(["apple", "banana", "carrot"], { conj: "or" })).toBe(
          "apple, banana, or carrot"
        )

        expect(yield* wordlist(["apple", "banana"], { conj: " or " })).toBe("apple  or  banana")
        expect(yield* wordlist(["apple", "banana"], { conj: "&" })).toBe("apple & banana")
        expect(yield* wordlist(["apple", "banana"], { conj: "&", conjSpaced: false })).toBe(
          "apple&banana"
        )
        expect(yield* wordlist(["apple", "banana"], { conj: "& ", conjSpaced: false })).toBe(
          "apple& banana"
        )

        expect(yield* wordlist(["apple", "banana", "carrot"], { conj: " or " })).toBe(
          "apple, banana,  or  carrot"
        )
        expect(yield* wordlist(["apple", "banana", "carrot"], { conj: "+" })).toBe(
          "apple, banana, + carrot"
        )
        expect(yield* wordlist(["apple", "banana", "carrot"], { conj: "&" })).toBe(
          "apple, banana, & carrot"
        )
        expect(
          yield* wordlist(["apple", "banana", "carrot"], { conj: "&", conjSpaced: false })
        ).toBe("apple, banana,&carrot")
        expect(
          yield* wordlist(["apple", "banana", "carrot"], { conj: " &", conjSpaced: false })
        ).toBe("apple, banana, &carrot")
      })
    )
  })

  test("test_doc_examples", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(yield* pluralNoun("I")).toBe("we")
        expect(yield* pluralVerb("saw")).toBe("saw")
        expect(yield* pluralAdj("my")).toBe("our")
        expect(yield* pluralNoun("saw")).toBe("saws")
        expect(yield* plural("was")).toBe("were")
        expect(yield* plural("was", 1)).toBe("was")
        expect(yield* pluralVerb("was", 2)).toBe("were")
        expect(yield* pluralVerb("was")).toBe("were")
        expect(yield* pluralVerb("was", 1)).toBe("was")

        for (const [errors, txt] of [
          [0, "There were no errors"],
          [1, "There was 1 error"],
          [2, "There were 2 errors"]
        ] as const) {
          expect(`There ${yield* pluralVerb("was", errors)}${yield* no(" error", errors)}`).toBe(
            txt
          )

          expect(yield* inflect(`There plural_verb('was',${errors}) no('error',${errors})`)).toBe(
            txt
          )
        }

        for (const [num1, num2, txt] of [
          [1, 2, "I saw 2 saws"],
          [2, 1, "we saw 1 saw"]
        ] as const) {
          expect(
            `${yield* num(num1, "")}${yield* plural("I")}${yield* pluralVerb(" saw")} ${yield* num(num2)}${yield* pluralNoun(" saw")}`
          ).toBe(txt)

          expect(
            yield* inflect(
              `num(${num1}, False)plural('I') plural_verb('saw') ` +
                `num(${num2}) plural_noun('saw')`
            )
          ).toBe(txt)
        }

        expect(yield* a("a cat")).toBe("a cat")

        for (const [word, txt] of [
          ["cat", "a cat"],
          ["aardvark", "an aardvark"],
          ["ewe", "a ewe"],
          ["hour", "an hour"]
        ] as const) {
          expect(yield* a(`${yield* numberToWords(1, { one: "a" })} ${word}`)).toBe(txt)
        }

        yield* num(2)
      })
    )
  })
})
