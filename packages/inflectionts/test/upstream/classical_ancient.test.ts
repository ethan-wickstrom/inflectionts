import { describe, expect, test } from "bun:test"

import * as Effect from "effect/Effect"
import { classical, pluralNoun } from "inflectionts"

import { runInflector } from "../helpers.ts"

// Port of jaraco/inflect tests/test_classical_ancient.py.
describe("test_classical_ancient.py", () => {
  test("test_ancient_1", async () => {
    await runInflector(
      Effect.gen(function* () {
        // DEFAULT...
        expect(yield* pluralNoun("formula")).toBe("formulas")

        // "person" PLURALS ACTIVATED...
        yield* classical({ ancient: true })
        expect(yield* pluralNoun("formula")).toBe("formulae")

        // OTHER CLASSICALS NOT ACTIVATED...
        expect(yield* pluralNoun("wildebeest")).toBe("wildebeests")
        expect(yield* pluralNoun("error", 0)).toBe("errors")
        expect(yield* pluralNoun("Sally")).toBe("Sallys")
        expect(yield* pluralNoun("brother")).toBe("brothers")
        expect(yield* pluralNoun("person")).toBe("people")
      })
    )
  })
})
