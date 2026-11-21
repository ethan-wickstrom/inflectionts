import { describe, expect, test } from "bun:test"

import * as BunServices from "@effect/platform-bun/BunServices"
import { AlreadySingularError, cli } from "@inflectionts/cli/Cli"
import { Command } from "effect/cli"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import { TestConsole } from "effect/testing"

const runCli = (args: ReadonlyArray<string>): Promise<ReadonlyArray<unknown>> =>
  Effect.runPromise(
    Effect.gen(function* () {
      yield* Command.runWith(cli, { version: "0.1.0" })(args)
      return yield* TestConsole.logLines
    }).pipe(Effect.provide(Layer.mergeAll(BunServices.layer, TestConsole.layer)))
  )

const runCliExit = (args: ReadonlyArray<string>) =>
  Effect.runPromiseExit(
    Command.runWith(cli, { version: "0.1.0" })(args).pipe(
      Effect.provide(Layer.mergeAll(BunServices.layer, TestConsole.layer))
    )
  )

const BIN_PATH = new URL("../src/bin.ts", import.meta.url).pathname

async function runBin(
  args: ReadonlyArray<string>
): Promise<{ readonly exitCode: number; readonly stdout: string; readonly stderr: string }> {
  const proc = Bun.spawn([process.execPath, "--no-env-file", BIN_PATH, ...args], {
    stdout: "pipe",
    stderr: "pipe"
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited
  ])
  return { exitCode, stdout, stderr }
}

describe("inflect CLI (Command.runWith)", () => {
  test("plural, singular, compare, article, no, participle, ordinal", async () => {
    expect(await runCli(["plural", "person"])).toEqual(["people"])
    expect(await runCli(["pl", "person", "--count", "1"])).toEqual(["person"])
    expect(await runCli(["plural", "was", "--part", "verb"])).toEqual(["were"])
    expect(await runCli(["plural", "my", "--part", "adj"])).toEqual(["our"])

    expect(await runCli(["singular", "people"])).toEqual(["person"])
    expect(await runCli(["singular", "horse", "--fallback"])).toEqual(["horse"])

    const alreadySingular = await runCliExit(["singular", "horse"])
    expect(Exit.isFailure(alreadySingular)).toBe(true)
    if (Exit.isFailure(alreadySingular) && alreadySingular.cause.reasons[0]?._tag === "Fail") {
      expect(alreadySingular.cause.reasons[0].error.cause).toBeInstanceOf(AlreadySingularError)
    }

    expect(await runCli(["compare", "index", "indices"])).toEqual(["s:p"])
    expect(await runCli(["cmp", "base", "basis"])).toEqual(["none"])
    expect(await runCli(["article", "hour"])).toEqual(["an hour"])
    expect(await runCli(["a", "university"])).toEqual(["a university"])
    expect(await runCli(["no", "error", "--count", "0"])).toEqual(["no errors"])
    expect(await runCli(["participle", "panics"])).toEqual(["panicking"])
    expect(await runCli(["ordinal", "21"])).toEqual(["21st"])
    expect(await runCli(["ord", "twenty-one"])).toEqual(["twenty-first"])
  })

  test("shared classical and gender flags configure the provided Inflector service", async () => {
    expect(await runCli(["--classical", "plural", "brother"])).toEqual(["brethren"])
    expect(await runCli(["--classical-ancient", "plural", "formula"])).toEqual(["formulae"])
    expect(await runCli(["--classical-herd", "plural", "wildebeest"])).toEqual(["wildebeest"])
    expect(await runCli(["--classical-persons", "plural", "person"])).toEqual(["persons"])
    expect(await runCli(["--classical-zero", "plural", "error", "--count", "0"])).toEqual(["error"])
    expect(await runCli(["--no-classical-names", "plural", "Sally"])).toEqual(["Sallies"])
    expect(await runCli(["--gender", "feminine", "singular", "they"])).toEqual(["she"])
    expect(await runCli(["singular", "they", "--gender-override", "masculine"])).toEqual(["he"])
  })

  test("words, currency, join, and template subcommands", async () => {
    expect(await runCli(["words", "1234"])).toEqual(["one thousand, two hundred and thirty-four"])
    expect(await runCli(["words", "1234", "--andword", ""])).toEqual([
      "one thousand, two hundred thirty-four"
    ])
    expect(await runCli(["words", "5551202", "--group", "1", "--zero", "oh"])).toEqual([
      "five, five, five, one, two, oh, two"
    ])
    expect(await runCli(["words", "1234", "--list"])).toEqual([
      JSON.stringify(["one thousand", "two hundred and thirty-four"])
    ])
    expect(await runCli(["words", "1000", "--threshold", "500", "--no-comma"])).toEqual(["1000"])
    expect(await runCli(["currency", "2.675"])).toEqual(["two and 68/100"])
    expect(await runCli(["currency", "101.01", "--andword", ""])).toEqual([
      "one hundred one and 01/100"
    ])
    expect(await runCli(["join", "apple", "banana", "carrot"])).toEqual([
      "apple, banana, and carrot"
    ])
    expect(
      await runCli([
        "join",
        "apple",
        "banana",
        "carrot",
        "--sep",
        "/",
        "--no-sep-spaced",
        "--conj",
        "",
        "--no-conj-spaced"
      ])
    ).toEqual(["apple/banana/carrot"])
    expect(await runCli(["template", "There plural_verb('was',2) no('error',2)"])).toEqual([
      "There were 2 errors"
    ])
  })
})

describe("inflect CLI executable (BunServices.layer + BunRuntime.runMain)", () => {
  test("runs src/bin.ts end to end and exits non-zero on invalid input", async () => {
    const ok1 = await runBin(["plural", "person"])
    expect(ok1.exitCode).toBe(0)
    expect(ok1.stdout.trim()).toBe("people")

    const ok2 = await runBin(["--classical-ancient", "plural", "formula"])
    expect(ok2.exitCode).toBe(0)
    expect(ok2.stdout.trim()).toBe("formulae")

    const ok3 = await runBin(["currency", "100020.56"])
    expect(ok3.exitCode).toBe(0)
    expect(ok3.stdout.trim()).toBe("one hundred thousand and twenty and 56/100")

    const help = await runBin(["--help"])
    expect(help.exitCode).toBe(0)
    expect(help.stdout).toContain("inflect")

    const bad = await runBin(["singular", "horse"])
    expect(bad.exitCode).toBe(1)
    expect(bad.stderr).toContain("'horse' is already singular")
    expect(bad.stderr).not.toContain("    at ")
  })
})
