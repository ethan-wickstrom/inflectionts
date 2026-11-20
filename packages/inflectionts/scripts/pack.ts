import { join, resolve } from "node:path"

/**
 * Pack the npm tarball for `inflectionts`.
 *
 * `bun pm pack` keeps the development `exports` (which point at `./src/*.ts`) and ignores
 * `publishConfig.exports`, so packing this directory directly ships a package whose imports
 * fail to resolve. This script stages what consumers receive in a temporary directory: the
 * built `dist/`, the repository README and LICENSE, and a manifest whose `exports` come from `publishConfig`
 * without the workspace-only `devDependencies` and `scripts`. It prints the tarball's
 * absolute path.
 *
 * Usage: bun scripts/pack.ts [destination-directory]
 */
import * as Predicate from "effect/Predicate"

const packageDir = resolve(import.meta.dir, "..")
const repoRoot = resolve(packageDir, "../..")
const destination = resolve(process.argv[2] ?? join(packageDir, "dist-pack"))

const manifest: unknown = await Bun.file(join(packageDir, "package.json")).json()
if (!Predicate.isObject(manifest) || !Predicate.isObject(manifest.publishConfig)) {
  throw new Error("packages/inflectionts/package.json must have a publishConfig object")
}
const { publishConfig, devDependencies: _dev, scripts: _scripts, ...published } = manifest
const { exports: publishExports, ...publishRest } = publishConfig
if (!Predicate.isObject(manifest.exports) || !Predicate.isObject(publishExports)) {
  throw new Error("package.json must declare both exports and publishConfig.exports")
}
if (!Bun.deepEquals(Object.keys(manifest.exports), Object.keys(publishExports))) {
  throw new Error("package.json exports and publishConfig.exports must declare the same keys")
}

await Bun.$`bun run build`.cwd(packageDir).quiet()

const stage = (await Bun.$`mktemp -d -t inflectionts-pack-XXXXXX`.text()).trim()
try {
  await Bun.$`cp -R ${join(packageDir, "dist")} ${join(repoRoot, "README.md")} ${join(repoRoot, "LICENSE")} ${stage}`
  await Bun.write(
    join(stage, "package.json"),
    `${JSON.stringify({ ...published, exports: publishExports, publishConfig: publishRest }, null, 2)}\n`
  )
  await Bun.$`mkdir -p ${destination}`
  await Bun.$`bun pm pack --destination ${destination} --quiet`.cwd(stage).quiet()
  console.log(join(destination, `inflectionts-${String(published.version)}.tgz`))
} finally {
  await Bun.$`rm -rf ${stage}`
}
