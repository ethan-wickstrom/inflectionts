import { describe, expect, test } from "bun:test"

import { classical, pluralNoun } from "@ethan-wickstrom/inflectionts"
import * as Effect from "effect/Effect"

import { runInflector } from "../helpers.ts"

// Port of jaraco/inflect tests/test_classical_person.py.
describe("test_classical_person.py", () => {
  test("test_ancient_1", async () => {
    await runInflector(
      Effect.gen(function* () {
        // DEFAULT...
        expect(yield* pluralNoun("person")).toBe("people")

        // "person" PLURALS ACTIVATED...
        yield* classical({ persons: true })
        expect(yield* pluralNoun("person")).toBe("persons")

        // OTHER CLASSICALS NOT ACTIVATED...
        expect(yield* pluralNoun("wildebeest")).toBe("wildebeests")
        expect(yield* pluralNoun("formula")).toBe("formulas")
        expect(yield* pluralNoun("error", 0)).toBe("errors")
        expect(yield* pluralNoun("brother")).toBe("brothers")
        expect(yield* pluralNoun("Sally")).toBe("Sallys")
        expect(yield* pluralNoun("Jones", 0)).toBe("Joneses")
      })
    )
  })
})
