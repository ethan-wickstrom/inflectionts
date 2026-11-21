import { describe, expect, test } from "bun:test"

import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import {
  allClassical,
  applyClassical,
  applyDefNoun,
  applyGender,
  BadGenderError,
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
  defaultState,
  defnoun,
  defverb,
  gender,
  getState,
  Inflector,
  InvalidWordError,
  isInflectorService,
  isInflectorState,
  no,
  noClassical,
  plural,
  pluralAdj,
  pluralNoun,
  pluralVerb,
  presentParticiple,
  singularNoun,
  StateTypeId,
  TypeId,
  UnknownClassicalModeError
} from "inflectionts"
import { BadGenderError as SubpathBadGenderError } from "inflectionts/Errors"
import { TypeId as SubpathTypeId } from "inflectionts/Inflector"
import { StateTypeId as SubpathStateTypeId } from "inflectionts/Schema"

import { bysize, enclose, joinstem, partitionWord, postprocess, udMatch } from "#internal/helpers"

import { runInflector, runInflectorExit } from "./helpers.ts"

const INFLECTIONS_FIXTURE_URL = new URL("./fixtures/inflections.txt", import.meta.url)

describe("helpers", () => {
  test("enclose, joinstem, bysize, partitionWord", () => {
    expect(enclose("test")).toBe("(?:test)")
    expect(joinstem(-2, ["ephemeris", "iris", ".*itis"])).toBe("(?:ephemer|ir|.*it)")
    expect(joinstem(null, ["ephemeris"])).toBe("(?:ephemeris)")
    expect(joinstem(5, null)).toBe("(?:)")

    const grouped = bysize(["ant", "cat", "dog", "pig", "frog", "goat", "horse", "elephant"])
    expect(Array.from(grouped.get(3) ?? []).sort()).toEqual(["ant", "cat", "dog", "pig"])
    expect(Array.from(grouped.get(5) ?? [])).toEqual(["horse"])

    const partitionCases: ReadonlyArray<readonly [string, readonly [string, string, string]]> = [
      [" cow ", [" ", "cow", " "]],
      ["cow", ["", "cow", ""]],
      ["   cow", ["   ", "cow", ""]],
      ["cow   ", ["", "cow", "   "]],
      ["  cow   ", ["  ", "cow", "   "]],
      ["", ["", "", ""]],
      ["bottle of beer", ["", "bottle of beer", ""]]
    ]
    for (const [input, expected] of partitionCases) {
      expect(partitionWord(input)).toEqual(expected)
    }
  })

  test("postprocess case normalization and classical alternation", async () => {
    await runInflector(
      Effect.gen(function* () {
        const state = yield* getState
        const cases: ReadonlyArray<readonly [string, string, string]> = [
          ["cow", "cows", "cows"],
          ["I", "we", "we"],
          ["COW", "cows", "COWS"],
          ["Cow", "cows", "Cows"],
          ["cow", "cows|kine", "cows"],
          ["Entry", "entries", "Entries"],
          ["can of Coke", "cans of coke", "cans of Coke"],
          ["a cat", "cats", "cats"],
          ["Cats and dogs", "Cats and dogs plus mice", "Cats and dogs plus mice"]
        ]
        for (const [orig, infl, expected] of cases) {
          expect(postprocess(orig, infl, state)).toBe(expected)
        }

        yield* classical()
        const classState = yield* getState
        expect(postprocess("cow", "cows|kine", classState)).toBe("kine")
      })
    )
  })
})

describe("inflections.txt corpus", () => {
  test("all non-TODO entries pass modern, classical, compare, and singularNoun checks", async () => {
    const raw = await Bun.file(INFLECTIONS_FIXTURE_URL).text()
    const lines = raw.split(/\r?\n/).map((l) => l.trim())
    let checkedCount = 0

    await runInflector(
      Effect.gen(function* () {
        for (const line of lines) {
          if (line.includes("TODO:") || !line.includes("->")) {
            continue
          }
          const arrowIdx = line.indexOf("->")
          const singular = line.slice(0, arrowIdx).trim()
          const rest = line.slice(arrowIdx + 2).trim()
          const hashIdx = rest.indexOf("#")
          const pluralPart = (hashIdx === -1 ? rest : rest.slice(0, hashIdx)).trim()
          const comment = hashIdx === -1 ? "" : rest.slice(hashIdx + 1).toLowerCase()

          const pipeIdx = pluralPart.indexOf("|")
          const modPlural = (pipeIdx === -1 ? pluralPart : pluralPart.slice(0, pipeIdx)).trim()
          const classPlural = (pipeIdx === -1 ? pluralPart : pluralPart.slice(pipeIdx + 1)).trim()

          const kind = comment.includes("verb")
            ? "verb"
            : comment.includes("noun")
              ? "noun"
              : "general"

          yield* classical({ all: false, names: false })
          const modVal =
            kind === "verb"
              ? yield* pluralVerb(singular)
              : kind === "noun"
                ? yield* pluralNoun(singular)
                : yield* plural(singular)

          yield* classical({ all: true })
          const classVal =
            kind === "verb"
              ? yield* pluralVerb(singular)
              : kind === "noun"
                ? yield* pluralNoun(singular)
                : yield* plural(singular)

          expect(modVal, `modern plural of '${singular}'`).toBe(modPlural)
          expect(classVal, `classical plural of '${singular}'`).toBe(classPlural)

          const cmp1 = comparisonCode(yield* compare(singular, modPlural))
          const cmp2 = comparisonCode(yield* compare(modPlural, singular))
          const cmp3 = comparisonCode(yield* compare(singular, classPlural))
          const cmp4 = comparisonCode(yield* compare(classPlural, singular))
          const validCodes: ReadonlyArray<string | undefined> = ["s:p", "p:s", "eq"]
          expect(validCodes, `compare('${singular}', '${modPlural}')`).toContain(cmp1)
          expect(validCodes, `compare('${modPlural}', '${singular}')`).toContain(cmp2)
          expect(validCodes, `compare('${singular}', '${classPlural}')`).toContain(cmp3)
          expect(validCodes, `compare('${classPlural}', '${singular}')`).toContain(cmp4)

          if (kind !== "verb") {
            const singMod = yield* singularNoun(modPlural, 1)
            const singClass = yield* singularNoun(classPlural, 1)
            expect(Option.getOrUndefined(singMod), `singularNoun('${modPlural}')`).toBe(singular)
            expect(Option.getOrUndefined(singClass), `singularNoun('${classPlural}')`).toBe(
              singular
            )
          }

          checkedCount += 1
        }
      })
    )

    expect(checkedCount).toBe(741)
  })
})

describe("classical modes", () => {
  test("all, zero, herd, names, persons, ancient toggles and validation", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect((yield* getState).classical).toEqual(defaultClassical)
        expect(yield* pluralNoun("error", 0)).toBe("errors")
        expect(yield* pluralNoun("wildebeest")).toBe("wildebeests")
        expect(yield* pluralNoun("Sally")).toBe("Sallys")
        expect(yield* pluralNoun("Jones", 0)).toBe("Joneses")
        expect(yield* pluralNoun("brother")).toBe("brothers")
        expect(yield* pluralNoun("person")).toBe("people")
        expect(yield* pluralNoun("formula")).toBe("formulas")

        yield* classical({ all: true })
        expect((yield* getState).classical).toEqual(allClassical)
        expect(yield* pluralNoun("error", 0)).toBe("error")
        expect(yield* pluralNoun("wildebeest")).toBe("wildebeest")
        expect(yield* pluralNoun("Sally")).toBe("Sallys")
        expect(yield* pluralNoun("brother")).toBe("brethren")
        expect(yield* pluralNoun("person")).toBe("persons")
        expect(yield* pluralNoun("formula")).toBe("formulae")

        yield* classical({ all: false })
        expect((yield* getState).classical).toEqual(noClassical)
        expect(yield* pluralNoun("error", 0)).toBe("errors")
        expect(yield* pluralNoun("wildebeest")).toBe("wildebeests")
        expect(yield* pluralNoun("Sally")).toBe("Sallies")
        expect(yield* pluralNoun("brother")).toBe("brothers")
        expect(yield* pluralNoun("person")).toBe("people")
        expect(yield* pluralNoun("formula")).toBe("formulas")

        yield* classical()
        expect((yield* getState).classical).toEqual(allClassical)
      })
    )

    // Individual classical categories do not activate others
    await runInflector(
      Effect.gen(function* () {
        yield* classical({ ancient: true })
        expect(yield* pluralNoun("formula")).toBe("formulae")
        expect(yield* pluralNoun("wildebeest")).toBe("wildebeests")
        expect(yield* pluralNoun("error", 0)).toBe("errors")
        expect(yield* pluralNoun("brother")).toBe("brothers")
        expect(yield* pluralNoun("person")).toBe("people")
      })
    )

    await runInflector(
      Effect.gen(function* () {
        yield* classical({ herd: true })
        expect(yield* pluralNoun("wildebeest")).toBe("wildebeest")
        expect(yield* pluralNoun("formula")).toBe("formulas")
        expect(yield* pluralNoun("person")).toBe("people")
      })
    )

    await runInflector(
      Effect.gen(function* () {
        yield* classical({ persons: true })
        expect(yield* pluralNoun("person")).toBe("persons")
        expect(yield* pluralNoun("formula")).toBe("formulas")
        expect(yield* pluralNoun("wildebeest")).toBe("wildebeests")
      })
    )

    await runInflector(
      Effect.gen(function* () {
        yield* classical({ zero: true })
        expect(yield* pluralNoun("error", 0)).toBe("error")
        expect(yield* pluralNoun("formula")).toBe("formulas")
      })
    )

    const badExit = await runInflectorExit(classical({ bogus: true }))
    expect(Exit.isFailure(badExit)).toBe(true)
    if (Exit.isFailure(badExit)) {
      const err = badExit.cause.reasons[0]
      expect(err?._tag).toBe("Fail")
      if (err?._tag === "Fail") {
        expect(err.error).toBeInstanceOf(UnknownClassicalModeError)
        expect(err.error.message).toBe(
          "Unknown classical mode 'bogus'; expected one of: all, zero, herd, names, persons, ancient"
        )
      }
    }
  })

  test("compare preserves classical mode", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(comparisonCode(yield* compare("formula", "formulae"))).toBe("s:p")
        expect((yield* getState).classical).toEqual(defaultClassical)
        expect(yield* plural("formula")).toBe("formulas")
      })
    )
  })
})

describe("compounds, uncountables, singular -ss, Unicode, and roundtrips", () => {
  test("compounds, degree units, fractional units, and open compounds", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(Option.getOrUndefined(yield* singularNoun("hello-out-there"))).toBe(
          "hello-out-there"
        )
        expect(Option.getOrUndefined(yield* singularNoun("hello out there"))).toBe(
          "hello out there"
        )
        expect(Option.getOrUndefined(yield* singularNoun("continue-to-operate"))).toBe(
          "continue-to-operate"
        )
        expect(Option.getOrUndefined(yield* singularNoun("case of diapers"))).toBe(
          "case of diapers"
        )
        expect(Option.getOrUndefined(yield* singularNoun("pair of scissors"))).toBe(
          "pair of scissors"
        )

        expect(yield* plural("degree celsius")).toBe("degrees celsius")
        expect(yield* plural("degree fahrenheit")).toBe("degrees fahrenheit")
        expect(yield* plural("degree rankine")).toBe("degrees rankine")
        expect(yield* plural("degree fahrenheit second")).toBe("degree fahrenheit seconds")

        expect(yield* plural("pound per square inch")).toBe("pounds per square inch")
        expect(yield* plural("metre per second")).toBe("metres per second")
        expect(yield* plural("kilometre per hour")).toBe("kilometres per hour")
        expect(yield* plural("cubic metre per second")).toBe("cubic metres per second")
        expect(yield* plural("dollar a year")).toBe("dollars a year")
        expect(yield* plural("foot per square second")).toBe("feet per square second")
        expect(yield* plural("mother-in-law per lifetime")).toBe("mothers-in-law per lifetime")
        expect(yield* plural("pound-force per square inch")).toBe("pounds-force per square inch")

        expect(yield* plural("watt per square meter degree celsius")).toBe(
          "watts per square meter degree celsius"
        )
        expect(yield* plural("degree celsius per hour")).toBe("degrees celsius per hour")
        expect(yield* plural("degree fahrenheit hour square foot per btuit inch")).toBe(
          "degree fahrenheit hour square feet per btuit inch"
        )

        expect(yield* plural("high school")).toBe("high schools")
        expect(yield* plural("master genie")).toBe("master genies")
        expect(yield* plural("MASTER genie")).toBe("MASTER genies")
        expect(yield* plural("Blood brother")).toBe("Blood brothers")
        expect(yield* plural("prima donna")).toBe("prima donnas")
        expect(yield* plural("prima DONNA")).toBe("prima DONNAS")
        expect(yield* plural("Old technology")).toBe("Old technologies")
        expect(yield* pluralNoun("Old technology")).toBe("Old technologies")
        expect(yield* plural("Old Mary")).toBe("Old Marys")
        expect(yield* plural("I'm only here for a minute, John.")).toBeTruthy()

        yield* classical({ all: true })
        expect(yield* plural("master genie")).toBe("master genii")
        expect(yield* plural("MASTER genie")).toBe("MASTER genii")
        expect(yield* plural("Blood brother")).toBe("Blood brethren")
        expect(yield* plural("prima donna")).toBe("prime donne")
        expect(yield* plural("prima DONNA")).toBe("prime DONNE")
      })
    )
  })

  test("uncountable mass nouns vs countable nouns", async () => {
    const massNouns = [
      "equipment",
      "luggage",
      "baggage",
      "jewelry",
      "machinery",
      "cutlery",
      "livestock",
      "furniture",
      "information"
    ]
    const countable: ReadonlyArray<readonly [string, string]> = [
      ["document", "documents"],
      ["moment", "moments"],
      ["element", "elements"],
      ["instrument", "instruments"],
      ["package", "packages"],
      ["message", "messages"],
      ["machine", "machines"],
      ["stock", "stocks"],
      ["block", "blocks"],
      ["cutter", "cutters"],
      ["cat", "cats"],
      ["box", "boxes"]
    ]
    await runInflector(
      Effect.gen(function* () {
        for (const noun of massNouns) {
          expect(yield* pluralNoun(noun)).toBe(noun)
        }
        for (const [sing, plur] of countable) {
          expect(yield* pluralNoun(sing)).toBe(plur)
        }
      })
    )
  })

  test("singularNoun on -ss words and -sses plurals", async () => {
    await runInflector(
      Effect.gen(function* () {
        for (const word of [
          "grass",
          "glass",
          "underpass",
          "boss",
          "loss",
          "moss",
          "cross",
          "dress",
          "stress"
        ]) {
          expect(Option.isNone(yield* singularNoun(word))).toBe(true)
        }
        const ssesPairs: ReadonlyArray<readonly [string, string]> = [
          ["grasses", "grass"],
          ["glasses", "glass"],
          ["bosses", "boss"],
          ["losses", "loss"],
          ["mosses", "moss"],
          ["crosses", "cross"],
          ["dresses", "dress"]
        ]
        for (const [plur, sing] of ssesPairs) {
          expect(Option.getOrUndefined(yield* singularNoun(plur))).toBe(sing)
        }
      })
    )
  })

  test("Times and Jones roundtrip and Unicode words", async () => {
    for (const flag of [false, true]) {
      await runInflector(
        Effect.gen(function* () {
          yield* classical({ all: flag })
          for (const word of ["Times", "Jones"]) {
            const plur = yield* pluralNoun(word, 2)
            expect(Option.getOrUndefined(yield* singularNoun(plur, 1))).toBe(word)
          }
        })
      )
    }

    await runInflector(
      Effect.gen(function* () {
        expect(yield* plural("cliché")).toBe("clichés")
        expect(yield* plural("ångström")).toBe("ångströms")
      })
    )
  })
})

describe("gender, comparisons, presentParticiple, and user-defined rules", () => {
  test("pronoun singularization across all 6 genders and invalid gender error", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(Option.getOrUndefined(yield* singularNoun("they"))).toBe("it")
        expect(Option.getOrUndefined(yield* singularNoun("themselves"))).toBe("itself")
        expect(Option.getOrUndefined(yield* singularNoun("theirs"))).toBe("its")
        expect(Option.getOrUndefined(yield* singularNoun("them"))).toBe("it")
        expect(Option.getOrUndefined(yield* singularNoun("to them"))).toBe("to it")

        yield* gender("feminine")
        expect(Option.getOrUndefined(yield* singularNoun("they"))).toBe("she")
        expect(Option.getOrUndefined(yield* singularNoun("themselves"))).toBe("herself")
        expect(Option.getOrUndefined(yield* singularNoun("theirs"))).toBe("hers")
        expect(Option.getOrUndefined(yield* singularNoun("them"))).toBe("her")
        expect(Option.getOrUndefined(yield* singularNoun("to them"))).toBe("to her")

        yield* gender("masculine")
        expect(Option.getOrUndefined(yield* singularNoun("they"))).toBe("he")
        expect(Option.getOrUndefined(yield* singularNoun("themselves"))).toBe("himself")
        expect(Option.getOrUndefined(yield* singularNoun("theirs"))).toBe("his")
        expect(Option.getOrUndefined(yield* singularNoun("them"))).toBe("him")

        yield* gender("gender-neutral")
        expect(Option.getOrUndefined(yield* singularNoun("they"))).toBe("they")
        expect(Option.getOrUndefined(yield* singularNoun("themselves"))).toBe("themself")
        expect(Option.getOrUndefined(yield* singularNoun("theirs"))).toBe("theirs")
        expect(Option.getOrUndefined(yield* singularNoun("them"))).toBe("them")

        yield* gender("feminine or masculine")
        expect(Option.getOrUndefined(yield* singularNoun("they"))).toBe("she or he")
        expect(Option.getOrUndefined(yield* singularNoun("them"))).toBe("her or him")

        yield* gender("masculine or feminine")
        expect(Option.getOrUndefined(yield* singularNoun("they"))).toBe("he or she")
        expect(Option.getOrUndefined(yield* singularNoun("them"))).toBe("him or her")

        // Per-call gender override
        expect(Option.getOrUndefined(yield* singularNoun("they", 1, "feminine"))).toBe("she")
      })
    )

    const badGenderExit = await runInflectorExit(gender("invalid"))
    expect(Exit.isFailure(badGenderExit)).toBe(true)
    if (Exit.isFailure(badGenderExit)) {
      const reason = badGenderExit.cause.reasons[0]
      expect(reason?._tag).toBe("Fail")
      if (reason?._tag === "Fail") {
        expect(reason.error).toBeInstanceOf(BadGenderError)
        expect(reason.error.message).toContain("Invalid gender 'invalid'; expected one of: neuter,")
      }
    }
  })

  test("compare, compareNouns, compareVerbs, compareAdjs", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(comparisonCode(yield* compare("index", "index"))).toBe("eq")
        expect(comparisonCode(yield* compare("index", "indexes"))).toBe("s:p")
        expect(comparisonCode(yield* compare("index", "indices"))).toBe("s:p")
        expect(comparisonCode(yield* compare("indexes", "index"))).toBe("p:s")
        expect(comparisonCode(yield* compare("indices", "index"))).toBe("p:s")
        expect(comparisonCode(yield* compare("indices", "indexes"))).toBe("p:p")
        expect(comparisonCode(yield* compare("indexes", "indices"))).toBe("p:p")

        expect(comparisonCode(yield* compare("base", "basis"))).toBeUndefined()
        expect(comparisonCode(yield* compare("syrinx", "syringe"))).toBeUndefined()
        expect(comparisonCode(yield* compare("she", "he"))).toBeUndefined()
        expect(comparisonCode(yield* compare("opus", "operas"))).toBeUndefined()
        expect(comparisonCode(yield* compare("taxi", "taxes"))).toBeUndefined()

        expect(comparisonCode(yield* compareNouns("person", "people"))).toBe("s:p")
        expect(comparisonCode(yield* compareVerbs("run", "ran"))).toBeUndefined()
        expect(comparisonCode(yield* compareVerbs("run", "run"))).toBe("eq")
        expect(comparisonCode(yield* compareVerbs("was", "were"))).toBe("s:p")
        expect(comparisonCode(yield* compareAdjs("my", "mine"))).toBeUndefined()
        expect(comparisonCode(yield* compareAdjs("my", "our"))).toBe("s:p")
        expect(comparisonCode(yield* compareAdjs("your", "our"))).toBeUndefined()
        expect(comparisonCode(yield* compareAdjs("indexes'", "indices'"))).toBe("p:p")
        expect(comparisonCode(yield* compare("inverted index", "inverted indices"))).toBe("s:p")
        expect(comparisonCode(yield* compare("inverted indexes", "inverted indices"))).toBe("p:p")
        expect(comparisonCode(yield* compare("opuses", "opera"))).toBe("p:p")
        expect(comparisonCode(yield* compare("brothers", "brethren"))).toBe("p:p")
        expect(comparisonCode(yield* compare("courts martial", "court martial"))).toBe("p:s")

        // Adjectives & possessives
        expect(yield* pluralAdj("a")).toBe("some")
        expect(yield* pluralAdj("this")).toBe("these")
        expect(yield* pluralAdj("that")).toBe("those")
        expect(yield* pluralAdj("my")).toBe("our")
        expect(yield* pluralAdj("cat's")).toBe("cats'")
        expect(yield* pluralAdj("child's")).toBe("children's")
        expect(yield* pluralAdj("John's")).toBe("Johns'")
        expect(yield* pluralAdj("tuna's")).toBe("tuna's")

        // Additional singularNoun and verb regression cases from test_pwd.py
        expect(Option.getOrUndefined(yield* singularNoun("zombies"))).toBe("zombie")
        expect(Option.getOrUndefined(yield* singularNoun("dancing shoes"))).toBe("dancing shoe")
        expect(Option.getOrUndefined(yield* singularNoun("Matisses"))).toBe("Matisse")
        expect(Option.getOrUndefined(yield* singularNoun("bouillabaisses"))).toBe("bouillabaisse")
        expect(Option.getOrUndefined(yield* singularNoun("Nietzsches"))).toBe("Nietzsche")
        expect(Option.getOrUndefined(yield* singularNoun("aches"))).toBe("ache")
        expect(Option.getOrUndefined(yield* singularNoun("Clives"))).toBe("Clive")
        expect(Option.getOrUndefined(yield* singularNoun("weaves"))).toBe("weave")
        expect(Option.isNone(yield* singularNoun("status"))).toBe(true)
        expect(Option.isNone(yield* singularNoun("hiatus"))).toBe(true)

        expect(yield* pluralVerb("wasn't")).toBe("weren't")
        expect(yield* pluralVerb("shouldn't")).toBe("shouldn't")
        expect(yield* pluralVerb("am going to")).toBe("are going to")
        expect(yield* pluralVerb("quizzes")).toBe("quiz")
        expect(yield* pluralVerb("horseshoes")).toBe("horseshoe")
        expect(yield* pluralVerb("does")).toBe("do")
        expect(yield* plural("knife")).toBe("knives")
        expect(yield* plural("knifes")).toBe("knife")
        expect(yield* plural("court martial")).toBe("courts martial")
        expect(yield* plural("son of a gun")).toBe("sons of guns")
        expect(yield* plural("son-of-a-gun")).toBe("sons-of-guns")
      })
    )
  })

  test("presentParticiple", async () => {
    await runInflector(
      Effect.gen(function* () {
        const cases: ReadonlyArray<readonly [string, string]> = [
          ["sees", "seeing"],
          ["eats", "eating"],
          ["bats", "batting"],
          ["hates", "hating"],
          ["spies", "spying"],
          ["skis", "skiing"],
          ["panics", "panicking"],
          ["picnics", "picnicking"],
          ["traffics", "trafficking"],
          ["mimics", "mimicking"],
          ["be", "being"],
          ["is", "being"],
          ["are", "being"],
          ["had", "having"],
          ["has", "having"],
          ["dies", "dying"],
          ["glues", "gluing"],
          ["eyes", "eying"],
          ["hoes", "hoeing"],
          ["alibis", "alibiing"],
          ["hammers", "hammering"],
          ["runs", "running"]
        ]
        for (const [verb, expected] of cases) {
          expect(yield* presentParticiple(verb)).toBe(expected)
        }
      })
    )
  })

  test("defnoun, defverb, defadj, defa, defan, case preservation, and typed errors", async () => {
    await runInflector(
      Effect.gen(function* () {
        expect(yield* plural("I", 2)).toBe("we")
        expect(yield* plural("URL", 2)).toBe("URLS")

        yield* defnoun("URL", "URLs", { case: "preserve" })
        expect(yield* plural("URL", 2)).toBe("URLs")
        expect(yield* pluralNoun("URL", 2)).toBe("URLs")
        expect(yield* plural("URL", 1)).toBe("URL")

        yield* defnoun("URL", "URLs")
        expect(yield* plural("URL", 2)).toBe("URLS")
        yield* defnoun("URL", "URLs", { case: "preserve" })
        expect(yield* plural("URL", 2)).toBe("URLs")
        yield* defnoun("URL", "URLs", { case: "normalize" })
        expect(yield* plural("URL", 2)).toBe("URLS")

        yield* defnoun("VAX", "VAXen")
        expect(yield* plural("VAX")).toBe("VAXEN")
        expect(udMatch("VAX", (yield* getState).plSbUserDefined)).toBe("VAXen")
        expect(udMatch("VVAX", (yield* getState).plSbUserDefined)).toBeUndefined()

        yield* defnoun("kin", "kine")
        yield* defnoun("(.*)x", "$1xen")
        expect(yield* no("kin", 0)).toBe("no kine")
        expect(yield* no("kin", 1)).toBe("1 kin")
        expect(yield* no("kin", 2)).toBe("2 kine")
        expect(yield* no("regex", 0)).toBe("no regexen")

        yield* defnoun("(.+i)o", "$1i")
        expect(yield* plural("studio")).toBe("studii")

        yield* defnoun("aviatrix", "aviatrices")
        expect(yield* plural("aviatrix")).toBe("aviatrices")
        yield* defnoun("aviatrix", "aviatrixes")
        expect(yield* plural("aviatrix")).toBe("aviatrixes")
        yield* defnoun("aviatrix", null)
        expect(udMatch("aviatrix", (yield* getState).plSbUserDefined)).toBeUndefined()

        yield* defnoun(null, "any")

        yield* defverb("foobar", "feebar", "foobar", "feebar", "foobars", "feebar")
        expect(yield* plural("foobar", 2)).toBe("feebar")
        expect(yield* plural("foobars", 2)).toBe("feebar")

        yield* defadj("red", "red|gules")
        expect(yield* plural("red", 2)).toBe("red")
        yield* classical({ all: true })
        expect(yield* plural("red", 2)).toBe("gules")

        yield* defa("h")
        yield* defan("horrendous.*")
        expect(udMatch("h", (yield* getState).articleUserDefined)).toBe("a")
        expect(udMatch("horrendously", (yield* getState).articleUserDefined)).toBe("an")
      })
    )

    // Layer isolation: URL preservation from previous layer does not leak
    await runInflector(
      Effect.gen(function* () {
        expect(yield* plural("URL", 2)).toBe("URLS")
      })
    )

    const badPatternExit = await runInflectorExit(defnoun("(??", null))
    expect(Exit.isFailure(badPatternExit)).toBe(true)
    if (Exit.isFailure(badPatternExit)) {
      const reason = badPatternExit.cause.reasons[0]
      expect(reason?._tag).toBe("Fail")
      if (reason?._tag === "Fail") {
        expect(reason.error).toBeInstanceOf(BadUserDefinedPatternError)
      }
    }

    const emptyWordExit = await runInflectorExit(pluralNoun(""))
    expect(Exit.isFailure(emptyWordExit)).toBe(true)
    if (Exit.isFailure(emptyWordExit)) {
      const reason = emptyWordExit.cause.reasons[0]
      expect(reason?._tag).toBe("Fail")
      if (reason?._tag === "Fail") {
        expect(reason.error).toBeInstanceOf(InvalidWordError)
      }
    }
  })

  test("TypeId branding, Function.dual state combinators, and subpath exports", async () => {
    expect(TypeId).toBe("~inflectionts/Inflector")
    expect(StateTypeId).toBe("~inflectionts/InflectorState")
    expect(SubpathTypeId).toBe(TypeId)
    expect(SubpathStateTypeId).toBe(StateTypeId)
    expect(SubpathBadGenderError).toBe(BadGenderError)
    expect(isInflectorState(defaultState)).toBe(true)
    expect(isInflectorState({})).toBe(false)

    // Data-last pipeline + data-first combinators
    const configured = await runInflector(
      Effect.succeed(defaultState).pipe(
        Effect.flatMap(applyClassical({ ancient: true })),
        Effect.flatMap(applyGender("feminine")),
        Effect.flatMap(applyDefNoun("URL", "URLs", { case: "preserve" }))
      )
    )
    expect(isInflectorState(configured)).toBe(true)

    await runInflector(
      Effect.gen(function* () {
        const svc = yield* Inflector
        expect(isInflectorService(svc)).toBe(true)
        expect(isInflectorService({})).toBe(false)
        expect(yield* pluralNoun("formula")).toBe("formulae")
        expect(yield* pluralNoun("URL")).toBe("URLs")
        expect(Option.getOrUndefined(yield* singularNoun("they"))).toBe("she")
      }),
      configured
    )
  })
})
