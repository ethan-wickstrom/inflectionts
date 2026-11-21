import { describe, expect, test } from "bun:test"

import { classical, pluralNoun } from "@ethan-wickstrom/inflectionts"
import * as Effect from "effect/Effect"

import { runInflector } from "../helpers.ts"

// Port of jaraco/inflect tests/test_classical_zero.py.
describe("test_classical_zero.py", () => {
  test("test_ancient_1", async () => {
    await runInflector(
      Effect.gen(function* () {
        // DEFAULT...
        expect(yield* pluralNoun("error", 0)).toBe("errors")

        // "person" PLURALS ACTIVATED...
        yield* classical({ zero: true })
        expect(yield* pluralNoun("error", 0)).toBe("error")

        // OTHER CLASSICALS NOT ACTIVATED...
        expect(yield* pluralNoun("wildebeest")).toBe("wildebeests")
        expect(yield* pluralNoun("formula")).toBe("formulas")
        expect(yield* pluralNoun("person")).toBe("people")
        expect(yield* pluralNoun("brother")).toBe("brothers")
        expect(yield* pluralNoun("Sally")).toBe("Sallys")
      })
    )
  })
})
