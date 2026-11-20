import { describe, expect, test } from "bun:test"
import { Schema } from "effect"
import { Word } from "inflectionts"

describe("inflectionts bootstrap", () => {
  test("decodes Word", () => {
    const decode = Schema.decodeUnknownSync(Word)
    expect(decode("cat")).toBe(Word.make("cat"))
  })
})
