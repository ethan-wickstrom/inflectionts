/**
 * Check every link in the repository's documentation.
 *
 * Reads the Markdown files at the repository root, `llms.txt`, and the Markdown under `docs/`,
 * `skills/`, `evals/`, and `packages/inflectionts/test/upstream/`. Relative links and links to
 * this repository on GitHub (`.../blob/main/<path>` and `.../tree/main/<path>`) are checked
 * offline: the file must exist and a `#fragment` must match a heading in it, slugged the way
 * GitHub does. With `--external`, every other `http(s)` link is fetched and must answer with a
 * status below 400.
 *
 * Usage: bun scripts/check-links.ts [--external]
 */
import * as BunRuntime from "@effect/platform-bun/BunRuntime"
import * as BunServices from "@effect/platform-bun/BunServices"
import { CliError, Command, Flag } from "effect/cli"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import { FetchHttpClient, HttpClient } from "effect/http"
import * as Path from "effect/Path"
import * as Schedule from "effect/Schedule"
import * as Schema from "effect/Schema"

class LinksCheckError extends Schema.TaggedError<
  LinksCheckError,
  { readonly brand: unique symbol }
>()("LinksCheckError", { message: Schema.String }) {
  // Command.run prints the message alone instead of logging a stack trace.
  override get [CliError.userMessage]() {
    return this.message
  }
}

const REPO_FILE_RE =
  /^https:\/\/github\.com\/ethan-wickstrom\/inflectionts\/(?:blob|tree)\/main\/(.*)$/

// npmjs.com answers 403 to every automated request, so package pages are checked against the
// registry API, which confirms the package exists.
const probeUrl = (url: string) =>
  url.replace(/^https:\/\/www\.npmjs\.com\/package\//, "https://registry.npmjs.org/")

interface Link {
  readonly source: string
  readonly line: number
  readonly target: string
}

/** Blank out fenced code blocks and inline code so their contents are not read as links. */
const proseLines = (markdown: string): ReadonlyArray<string> => {
  let inFence = false
  return markdown.split("\n").map((line) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      return ""
    }
    return inFence ? "" : line.replaceAll(/`[^`]*`/g, "")
  })
}

/** Collect inline links, images, autolinks, and reference definitions with their line numbers. */
export const extractLinks = (source: string, markdown: string): ReadonlyArray<Link> =>
  proseLines(markdown).flatMap((line, index) =>
    [
      ...line.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g),
      ...line.matchAll(/<(https?:\/\/[^>\s]+)>/g),
      ...line.matchAll(/^\s*\[[^\]]+\]:\s*(\S+)/g)
    ].flatMap((match) =>
      match[1] === undefined ? [] : [{ source, line: index + 1, target: match[1] }]
    )
  )

/** The anchors GitHub generates for the headings of a Markdown file. */
export const headingAnchors = (markdown: string): ReadonlySet<string> => {
  const seen = new Map<string, number>()
  const anchors = new Set<string>()
  for (const line of proseLines(markdown)) {
    const heading = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line)?.[1]
    if (heading === undefined) continue
    const slug = heading
      .replaceAll(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replaceAll(/[*`]/g, "")
      .toLowerCase()
      .replaceAll(/[^\p{L}\p{N}\s_-]/gu, "")
      .replaceAll(/\s/g, "-")
    const count = seen.get(slug) ?? 0
    seen.set(slug, count + 1)
    anchors.add(count === 0 ? slug : `${slug}-${count}`)
  }
  return anchors
}

const listSources = Effect.fnUntraced(function* (repoRoot: string) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const isDoc = (name: string) => name.endsWith(".md") || name === "llms.txt"
  const nested: Array<string> = []
  for (const dir of ["docs", "skills", "evals", "packages/inflectionts/test/upstream"]) {
    if (!(yield* fs.exists(path.join(repoRoot, dir)))) continue
    const names = yield* fs.readDirectory(path.join(repoRoot, dir), { recursive: true })
    nested.push(...names.filter(isDoc).map((name) => path.join(dir, name)))
  }
  const root = (yield* fs.readDirectory(repoRoot)).filter(isDoc)
  return [...root, ...nested].toSorted()
})

const checkLinks = Effect.fn("checkLinks")(function* (options: { readonly external: boolean }) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const repoRoot = path.resolve(import.meta.dir, "../../..")

  const sources = yield* listSources(repoRoot)
  const links: Array<Link> = []
  for (const source of sources) {
    links.push(...extractLinks(source, yield* fs.readFileString(path.join(repoRoot, source))))
  }

  const anchorCache = new Map<string, ReadonlySet<string>>()
  const anchorsOf = Effect.fnUntraced(function* (file: string) {
    const cached = anchorCache.get(file)
    if (cached !== undefined) return cached
    const anchors = headingAnchors(yield* fs.readFileString(file))
    anchorCache.set(file, anchors)
    return anchors
  })

  const failures: Array<string> = []
  const external = new Map<string, Array<Link>>()
  for (const link of links) {
    const where = `${link.source}:${link.line}: ${link.target}`
    const repoPath = REPO_FILE_RE.exec(link.target)?.[1]
    if (repoPath === undefined && /^[a-z]+:/i.test(link.target)) {
      if (/^https?:/.test(link.target)) {
        external.set(link.target, [...(external.get(link.target) ?? []), link])
      }
      continue
    }
    const [filePart = "", fragment] = (repoPath ?? link.target).split("#", 2)
    const file =
      filePart === ""
        ? path.join(repoRoot, link.source)
        : repoPath === undefined
          ? path.resolve(path.dirname(path.join(repoRoot, link.source)), decodeURI(filePart))
          : path.join(repoRoot, decodeURI(filePart))
    if (!(yield* fs.exists(file))) {
      failures.push(`${where}: ${path.relative(repoRoot, file)} does not exist`)
    } else if (fragment !== undefined && file.endsWith(".md")) {
      if (!(yield* anchorsOf(file)).has(fragment)) {
        failures.push(`${where}: no heading with anchor #${fragment}`)
      }
    }
  }

  if (options.external) {
    const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk)
    const results = yield* Effect.forEach(
      [...external.keys()],
      (url) =>
        client.get(probeUrl(url), { headers: { "user-agent": "inflectionts-link-check" } }).pipe(
          Effect.timeout("20 seconds"),
          // One slow answer from a busy site should not fail CI; a dead link fails all three tries.
          Effect.retry({ times: 2, schedule: Schedule.exponential("2 seconds") }),
          Effect.as(undefined),
          Effect.catch((error) => Effect.succeed(`${url}: ${error.message}`))
        ),
      { concurrency: 8 }
    )
    for (const result of results) {
      if (result === undefined) continue
      const [url = ""] = result.split(": ", 1)
      const at = (external.get(url) ?? []).map((link) => `${link.source}:${link.line}`).join(", ")
      failures.push(`${at}: ${result}`)
    }
  }

  if (failures.length > 0) {
    return yield* new LinksCheckError({
      message: `${failures.length} broken link(s):\n${failures.join("\n")}`
    })
  }
  yield* Console.log(
    `Checked ${links.length} links in ${sources.length} files (${external.size} external, ${options.external ? "fetched" : "not fetched; pass --external"})`
  )
})

if (import.meta.main) {
  Command.make(
    "check-links",
    {
      external: Flag.Boolean("external").pipe(
        Flag.withDescription("Also fetch every external http(s) link"),
        Flag.withDefault(false)
      )
    },
    checkLinks
  ).pipe(
    Command.withDescription("Check relative, repository, and (optionally) external doc links"),
    Command.run({ version: "0.1.0" }),
    Effect.provide([BunServices.layer, FetchHttpClient.layer]),
    BunRuntime.runMain
  )
}
