import { describe, expect, test } from "bun:test"

import { join } from "@ethan-wickstrom/inflectionts"
import * as Effect from "effect/Effect"

import { runInflector } from "../helpers.ts"

// Port of jaraco/inflect tests/test_join.py.
describe("test_join.py", () => {
  test("test_join", async () => {
    await runInflector(
      Effect.gen(function* () {
        // Three words...
        let words: ReadonlyArray<string> = ["apple", "banana", "carrot"]

        // upstream only asserts truthiness: `assert p.join(words), "apple, banana == and carrot"`
        expect(yield* join(words)).toBeTruthy()
        expect(yield* join(words, { finalSep: "" })).toBe("apple, banana and carrot")
        expect(yield* join(words, { finalSep: "..." })).toBe("apple, banana... and carrot")
        expect(yield* join(words, { finalSep: "...", conj: "" })).toBe("apple, banana... carrot")
        expect(yield* join(words, { conj: "or" })).toBe("apple, banana, or carrot")

        // Three words with semicolons...
        words = ["apple,fuji", "banana", "carrot"]

        expect(yield* join(words)).toBe("apple,fuji; banana; and carrot")
        expect(yield* join(words, { finalSep: "" })).toBe("apple,fuji; banana and carrot")
        expect(yield* join(words, { finalSep: "..." })).toBe("apple,fuji; banana... and carrot")
        expect(yield* join(words, { finalSep: "...", conj: "" })).toBe(
          "apple,fuji; banana... carrot"
        )
        expect(yield* join(words, { conj: "or" })).toBe("apple,fuji; banana; or carrot")

        // Two words...
        words = ["apple", "carrot"]

        expect(yield* join(words)).toBe("apple and carrot")
        expect(yield* join(words, { finalSep: "" })).toBe("apple and carrot")
        expect(yield* join(words, { finalSep: "..." })).toBe("apple and carrot")
        expect(yield* join(words, { finalSep: "...", conj: "" })).toBe("apple carrot")
        expect(yield* join(words, { finalSep: "...", conj: "", conjSpaced: false })).toBe(
          "applecarrot"
        )
        expect(yield* join(words, { conj: "or" })).toBe("apple or carrot")

        // One word...
        words = ["carrot"]

        expect(yield* join(words)).toBe("carrot")
        expect(yield* join(words, { finalSep: "" })).toBe("carrot")
        expect(yield* join(words, { finalSep: "..." })).toBe("carrot")
        expect(yield* join(words, { finalSep: "...", conj: "" })).toBe("carrot")
        expect(yield* join(words, { conj: "or" })).toBe("carrot")
      })
    )
  })
})
