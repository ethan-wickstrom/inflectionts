/**
 * Type-check and run every TypeScript code block in the user documentation.
 *
 * Reads `README.md` and every Markdown file in `docs/` at the repository root. Each fenced
 * block whose info string is `ts` is written to a scoped temporary directory inside this
 * package (so `inflectionts` and `effect` resolve as they do for users), type-checked with
 * the repository's TypeScript in strict mode, and run with Bun. When the next fenced block
 * has the info string `output`, the program's standard output must equal it exactly.
 * Blocks tagged `ts no-run` are type-checked but not run.
 *
 * Usage: bun scripts/check-docs.ts
 */
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as BunServices from "@effect/platform-bun/BunServices"
import { Command } from "effect/cli"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import { ChildProcess } from "effect/process"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

class DocsCheckError extends Schema.TaggedError<
  DocsCheckError,
  { readonly brand: unique symbol }
>()("DocsCheckError", { message: Schema.String }) {}

interface Block {
  readonly source: string
  readonly line: number
  readonly code: string
  readonly run: boolean
  readonly expected: string | undefined
}

/** Split Markdown into fenced blocks and pair each `ts` block with a following `output` block. */
export const extractBlocks = (source: string, markdown: string): ReadonlyArray<Block> => {
  const fences: Array<{ readonly info: string; readonly line: number; readonly body: string }> = []
  const lines = markdown.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const open = /^```(\S.*)?$/.exec(lines[i] ?? "")
    if (open === null) continue
    const start = i
    const body: Array<string> = []
    for (i++; i < lines.length && lines[i] !== "```"; i++) body.push(lines[i] ?? "")
    fences.push({ info: (open[1] ?? "").trim(), line: start + 1, body: body.join("\n") })
  }
  return fences.flatMap((fence, index) => {
    const [lang, ...flags] = fence.info.split(/\s+/)
    if (lang !== "ts") return []
    const next = fences[index + 1]
    return [
      {
        source,
        line: fence.line,
        code: fence.body,
        run: !flags.includes("no-run"),
        expected: next?.info === "output" ? next.body : undefined
      }
    ]
  })
}

/** Run a command and return its stdout, stderr, and exit code. */
const exec = Effect.fnUntraced(function* (
  cwd: string,
  command: string,
  args: ReadonlyArray<string>
) {
  const handle = yield* ChildProcess.make(command, args, { cwd })
  const [stdout, stderr, exitCode] = yield* Effect.all(
    [
      Stream.mkString(Stream.decodeText(handle.stdout)),
      Stream.mkString(Stream.decodeText(handle.stderr)),
      handle.exitCode
    ],
    { concurrency: "unbounded" }
  )
  return { stdout, stderr, exitCode }
}, Effect.scoped)

const checkDocs = Effect.fn("checkDocs")(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const packageDir = path.resolve(import.meta.dir, "..")
  const repoRoot = path.resolve(packageDir, "../..")
  const docsDir = path.join(repoRoot, "docs")

  const sources = [
    "README.md",
    ...(yield* fs.readDirectory(docsDir))
      .filter((name) => name.endsWith(".md"))
      .toSorted()
      .map((name) => path.join("docs", name))
  ]
  const blocks: Array<Block> = []
  for (const source of sources) {
    blocks.push(...extractBlocks(source, yield* fs.readFileString(path.join(repoRoot, source))))
  }
  if (blocks.length === 0) {
    return yield* new DocsCheckError({ message: "no ts code blocks found in README.md or docs/" })
  }

  const dir = yield* fs.makeTempDirectoryScoped({ directory: packageDir, prefix: ".doc-blocks-" })
  const fileOf = (block: Block) =>
    path.join(dir, `${block.source.replaceAll(/[^A-Za-z0-9]/g, "_")}_L${block.line}.ts`)
  for (const block of blocks) yield* fs.writeFileString(fileOf(block), `${block.code}\n`)
  yield* fs.writeFileString(
    path.join(dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        exactOptionalPropertyTypes: true,
        noUncheckedIndexedAccess: true,
        noEmit: true,
        skipLibCheck: true,
        module: "Preserve",
        moduleResolution: "Bundler",
        target: "ESNext",
        moduleDetection: "force",
        allowImportingTsExtensions: true,
        types: ["bun"],
        paths: { inflectionts: [path.join(packageDir, "src/index.ts")] }
      },
      include: ["*.ts"]
    })
  )

  const relabel = (text: string) =>
    blocks.reduce(
      (out, block) => out.replaceAll(path.basename(fileOf(block)), `${block.source}:${block.line}`),
      text
    )
  const tsc = yield* exec(packageDir, "bun", ["run", "--bun", "tsc", "-p", dir])
  if (tsc.exitCode !== 0) {
    return yield* new DocsCheckError({
      message: `Doc code blocks fail to type-check:\n${relabel(tsc.stdout + tsc.stderr)}`
    })
  }

  const failures: Array<string> = []
  for (const block of blocks.filter((b) => b.run)) {
    const result = yield* exec(dir, "bun", ["--no-env-file", fileOf(block)])
    const where = `${block.source}:${block.line}`
    if (result.exitCode !== 0) {
      failures.push(`${where} exited ${result.exitCode}:\n${relabel(result.stderr)}`)
    } else if (
      block.expected !== undefined &&
      result.stdout.trimEnd() !== block.expected.trimEnd()
    ) {
      failures.push(
        `${where} printed:\n${result.stdout.trimEnd()}\nbut its output block says:\n${block.expected.trimEnd()}`
      )
    }
  }
  if (failures.length > 0) {
    return yield* new DocsCheckError({ message: failures.join("\n\n") })
  }
  const ran = blocks.filter((b) => b.run).length
  yield* Console.log(
    `Checked ${blocks.length} doc code blocks in ${sources.length} files (${ran} run, ${blocks.filter((b) => b.expected !== undefined).length} with expected output)`
  )
}, Effect.scoped)

if (import.meta.main) {
  Command.make("check-docs", {}, () => checkDocs()).pipe(
    Command.withDescription("Type-check and run the TypeScript code blocks in README.md and docs/"),
    Command.run({ version: "0.1.0" }),
    Effect.provide(BunServices.layer),
    BunRuntime.runMain
  )
}
