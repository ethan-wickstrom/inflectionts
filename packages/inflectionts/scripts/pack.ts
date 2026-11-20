/**
 * Pack the npm tarball for `inflectionts` and print its absolute path.
 *
 * `bun pm pack` keeps the development `exports` (which point at `./src/*.ts`) and ignores
 * `publishConfig.exports`, so packing this directory directly ships a package whose imports
 * fail to resolve. This program builds the package, then stages what consumers receive in a
 * scoped temporary directory: `dist/`, the repository README and LICENSE, and a manifest whose
 * `exports` come from `publishConfig` without the workspace-only `devDependencies` and
 * `scripts`.
 *
 * Usage: bun scripts/pack.ts [destination]
 */
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as BunServices from "@effect/platform-bun/BunServices"
import { Argument, Command } from "effect/cli"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Option from "effect/Option"
import * as Path from "effect/Path"
import { ChildProcess } from "effect/process"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

class PackError extends Schema.TaggedError<PackError, { readonly brand: unique symbol }>()(
  "PackError",
  {
    message: Schema.String
  }
) {}

const Fields = Schema.Record(Schema.String, Schema.Unknown)

const Manifest = Schema.fromJsonString(
  Schema.StructWithRest(
    Schema.Struct({
      version: Schema.String,
      exports: Fields,
      publishConfig: Schema.StructWithRest(Schema.Struct({ exports: Fields }), [Fields])
    }),
    [Fields]
  )
)

/** Run a command in `cwd`, failing with its combined output when it exits non-zero. */
const run = Effect.fnUntraced(function* (
  cwd: string,
  command: string,
  args: ReadonlyArray<string>
) {
  const handle = yield* ChildProcess.make(command, args, { cwd })
  const [output, exitCode] = yield* Effect.all(
    [Stream.mkString(Stream.decodeText(handle.all)), handle.exitCode],
    { concurrency: "unbounded" }
  )
  if (exitCode !== 0) {
    return yield* new PackError({
      message: `${command} ${args.join(" ")} exited with ${exitCode} in ${cwd}\n${output}`
    })
  }
}, Effect.scoped)

const pack = Effect.fn("pack")(function* (destination: Option.Option<string>) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  const packageDir = path.resolve(import.meta.dir, "..")
  const repoRoot = path.resolve(packageDir, "../..")
  const outDir = path.resolve(
    Option.getOrElse(destination, () => path.join(packageDir, "dist-pack"))
  )

  const {
    publishConfig,
    devDependencies: _dev,
    scripts: _scripts,
    ...published
  } = yield* Schema.decodeEffect(Manifest)(
    yield* fs.readFileString(path.join(packageDir, "package.json"))
  )
  const { exports: publishExports, ...publishRest } = publishConfig
  if (Object.keys(published.exports).join() !== Object.keys(publishExports).join()) {
    return yield* new PackError({
      message: "package.json exports and publishConfig.exports must declare the same keys"
    })
  }

  yield* run(packageDir, "bun", ["run", "build"])

  const stage = yield* fs.makeTempDirectoryScoped({ prefix: "inflectionts-pack-" })
  yield* fs.copy(path.join(packageDir, "dist"), path.join(stage, "dist"))
  yield* fs.copyFile(path.join(repoRoot, "README.md"), path.join(stage, "README.md"))
  yield* fs.copyFile(path.join(repoRoot, "LICENSE"), path.join(stage, "LICENSE"))
  yield* fs.writeFileString(
    path.join(stage, "package.json"),
    `${JSON.stringify({ ...published, exports: publishExports, publishConfig: publishRest }, null, 2)}\n`
  )
  yield* fs.makeDirectory(outDir, { recursive: true })
  yield* run(stage, "bun", ["pm", "pack", "--destination", outDir, "--quiet"])

  yield* Console.log(path.join(outDir, `inflectionts-${published.version}.tgz`))
}, Effect.scoped)

const command = Command.make(
  "pack",
  {
    destination: Argument.String("destination").pipe(
      Argument.withDescription("Directory to write the tarball to (default: dist-pack)"),
      Argument.optional
    )
  },
  ({ destination }) => pack(destination)
).pipe(Command.withDescription("Pack the inflectionts npm tarball with its publish exports"))

command.pipe(
  Command.run({ version: "0.1.0" }),
  Effect.provide(BunServices.layer),
  BunRuntime.runMain
)
