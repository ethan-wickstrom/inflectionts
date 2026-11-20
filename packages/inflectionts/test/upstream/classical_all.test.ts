import { describe, expect, test } from "bun:test"

import * as Effect from "effect/Effect"
import { classical, pluralNoun } from "inflectionts"

import { runInflector } from "../helpers.ts"

// Port of jaraco/inflect tests/test_classical_all.py.
describe("test_classical_all.py", () => {
  test("test_classical", async () => {
    await runInflector(
      Effect.gen(function* () {
        // DEFAULT...
        expect(yield* pluralNoun("error", 0)).toBe("errors")
        expect(yield* pluralNoun("wildebeest")).toBe("wildebeests")
        expect(yield* pluralNoun("Sally")).toBe("Sallys")
        expect(yield* pluralNoun("brother")).toBe("brothers")
        expect(yield* pluralNoun("person")).toBe("people")
        expect(yield* pluralNoun("formula")).toBe("formulas")

        // CLASSICAL PLURALS ACTIVATED...
        yield* classical({ all: true })
        expect(yield* pluralNoun("error", 0)).toBe("error")
        expect(yield* pluralNoun("wildebeest")).toBe("wildebeest")
        expect(yield* pluralNoun("Sally")).toBe("Sallys")
        expect(yield* pluralNoun("brother")).toBe("brethren")
        expect(yield* pluralNoun("person")).toBe("persons")
        expect(yield* pluralNoun("formula")).toBe("formulae")

        // CLASSICAL PLURALS DEACTIVATED...
        yield* classical({ all: false })
        expect(yield* pluralNoun("error", 0)).toBe("errors")
        expect(yield* pluralNoun("wildebeest")).toBe("wildebeests")
        expect(yield* pluralNoun("Sally")).toBe("Sallies")
        expect(yield* pluralNoun("brother")).toBe("brothers")
        expect(yield* pluralNoun("person")).toBe("people")
        expect(yield* pluralNoun("formula")).toBe("formulas")

        // CLASSICAL PLURALS REREREACTIVATED...
        yield* classical()
        expect(yield* pluralNoun("error", 0)).toBe("error")
        expect(yield* pluralNoun("wildebeest")).toBe("wildebeest")
        expect(yield* pluralNoun("Sally")).toBe("Sallys")
        expect(yield* pluralNoun("brother")).toBe("brethren")
        expect(yield* pluralNoun("person")).toBe("persons")
        expect(yield* pluralNoun("formula")).toBe("formulae")
      })
    )
  })
})
