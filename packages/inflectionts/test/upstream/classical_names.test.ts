import { describe, expect, test } from "bun:test"

import * as Effect from "effect/Effect"
import { classical, pluralNoun } from "inflectionts"

import { runInflector } from "../helpers.ts"

// Port of jaraco/inflect tests/test_classical_names.py.
describe("test_classical_names.py", () => {
  test("test_ancient_1", async () => {
    await runInflector(
      Effect.gen(function* () {
        // DEFAULT...
        expect(yield* pluralNoun("Sally")).toBe("Sallys")
        expect(yield* pluralNoun("Jones", 0)).toBe("Joneses")

        // "person" PLURALS ACTIVATED...
        yield* classical({ names: true })
        expect(yield* pluralNoun("Sally")).toBe("Sallys")
        expect(yield* pluralNoun("Jones", 0)).toBe("Joneses")

        // OTHER CLASSICALS NOT ACTIVATED...
        expect(yield* pluralNoun("wildebeest")).toBe("wildebeests")
        expect(yield* pluralNoun("formula")).toBe("formulas")
        expect(yield* pluralNoun("error", 0)).toBe("errors")
        expect(yield* pluralNoun("brother")).toBe("brothers")
        expect(yield* pluralNoun("person")).toBe("people")
      })
    )
  })
})
