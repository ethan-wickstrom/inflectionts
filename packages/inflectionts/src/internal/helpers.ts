import { Predicate } from "effect"
import type { CountInput, InflectorState, UserDefinedEntry } from "../Schema.ts"

export const PL_COUNT_ZERO: ReadonlySet<string> = new Set(["0", "no", "zero", "nil"])
export const PL_COUNT_ONE: ReadonlySet<string> = new Set(["1", "a", "an", "one", "each", "every", "this", "that"])

const PARTITION_WORD_RE = /^(\s*)(.+?)(\s*)$/
const DOLLAR_DIGITS_RE = /\$(\d+)/g

export function enclose(s: string): string {
  return `(?:${s})`
}

export function slicePrefix(word: string, cutpoint: number | null): string {
  if (cutpoint === null) {
    return word
  }
  return word.slice(0, cutpoint)
}

export function joinstem(cutpoint: number | null = 0, words: Iterable<string> | null = null): string {
  if (words === null) {
    return enclose("")
  }
  const stems: Array<string> = []
  for (const w of words) {
    stems.push(slicePrefix(w, cutpoint))
  }
  return enclose(stems.join("|"))
}

export function bysize(words: Iterable<string>): ReadonlyMap<number, ReadonlySet<string>> {
  const res = new Map<number, Set<string>>()
  for (const w of words) {
    let bucket = res.get(w.length)
    if (bucket === undefined) {
      bucket = new Set<string>()
      res.set(w.length, bucket)
    }
    bucket.add(w)
  }
  return res
}

export interface PlSiLists {
  readonly siList: ReadonlyArray<string>
  readonly siBysize: ReadonlyMap<number, ReadonlySet<string>>
  readonly plBysize: ReadonlyMap<number, ReadonlySet<string>>
  readonly stem: string
}

export function makePlSiLists(
  list: Iterable<string>,
  plEnding: string,
  siEndingSize: number | null,
  doJoinStem = true
): PlSiLists {
  const words = Array.from(list)
  const cutpoint = siEndingSize === null ? null : -siEndingSize
  const siList = words.map((w) => slicePrefix(w, cutpoint) + plEnding)
  const plBysize = bysize(words)
  const siBysize = bysize(siList)
  const stem = doJoinStem ? joinstem(cutpoint, words) : ""
  return { siList, siBysize, plBysize, stem }
}

export function matchesBysizeSuffix(word: string, table: ReadonlyMap<number, ReadonlySet<string>>): boolean {
  for (const [k, set] of table) {
    if (word.length >= k && set.has(word.slice(-k))) {
      return true
    }
  }
  return false
}

export function capitalize(s: string): string {
  if (s.length === 0) {
    return s
  }
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export function splitWhitespace(s: string): ReadonlyArray<string> {
  const trimmed = s.trim()
  if (trimmed.length === 0) {
    return []
  }
  return trimmed.split(/\s+/)
}

export interface ParsedWords {
  readonly raw: string
  readonly lowered: string
  readonly split: ReadonlyArray<string>
  readonly first: string
  readonly last: string
}

export function parseWords(orig: string): ParsedWords | undefined {
  const split = splitWhitespace(orig)
  const first = split[0]
  const last = split[split.length - 1]
  if (first === undefined || last === undefined) {
    return undefined
  }
  return {
    raw: orig,
    lowered: orig.toLowerCase(),
    split,
    first,
    last
  }
}

export function partitionWord(text: string): readonly [string, string, string] {
  const match = PARTITION_WORD_RE.exec(text)
  if (match === null) {
    return ["", "", ""]
  }
  return [match[1] ?? "", match[2] ?? "", match[3] ?? ""]
}

export function recase(original: string, inflected: string, preserveCase: ReadonlySet<string>): string {
  if (preserveCase.has(original)) {
    return inflected
  }
  if (original === original.toUpperCase()) {
    return inflected.toUpperCase()
  }
  if (original === capitalize(original)) {
    return capitalize(inflected)
  }
  return inflected
}

export function postprocess(orig: string, inflected: string, state: InflectorState): string {
  const optionIndex = state.classical.all ? 1 : 0
  let result: Array<string>

  if (inflected.includes("|")) {
    const wordOptions = inflected.split("|")
    const opt0 = wordOptions[0] ?? ""
    const opt1 = wordOptions[1] ?? opt0
    if (opt0.split(" ").length === opt1.split(" ").length) {
      const chosen = wordOptions[optionIndex] ?? opt0
      result = chosen.split(" ")
    } else {
      result = inflected.split(" ").map((word) => {
        if (!word.includes("|")) {
          return word
        }
        const parts = word.split("|")
        return parts[optionIndex] ?? parts[0] ?? word
      })
    }
  } else {
    result = inflected.split(" ")
  }

  const originals = orig.split(" ")
  const out: Array<string> = []
  const aligned = Math.min(originals.length, result.length)
  for (let i = 0; i < aligned; i++) {
    const o = originals[i]
    const r = result[i]
    if (o !== undefined && r !== undefined) {
      out.push(recase(o, r, state.preserveCase))
    }
  }
  for (let i = aligned; i < result.length; i++) {
    const r = result[i]
    if (r !== undefined) {
      out.push(r)
    }
  }
  return out.join(" ")
}

export function udMatch(word: string, entries: ReadonlyArray<UserDefinedEntry>): string | undefined {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]
    if (entry === undefined || entry.pattern === null) {
      continue
    }
    const re = new RegExp(`^${entry.pattern}$`, "i")
    const match = re.exec(word)
    if (match !== null) {
      if (entry.replacement === null) {
        return undefined
      }
      const replacement = entry.replacement
      return replacement.replace(DOLLAR_DIGITS_RE, (_full, groupIdx: string) => {
        const idx = Number(groupIdx)
        return match[idx] ?? ""
      })
    }
  }
  return undefined
}

export function formatCountValue(count: CountInput): string {
  if (count === null || count === undefined) {
    return ""
  }
  if (Predicate.isString(count)) {
    return count
  }
  if (Predicate.isNumber(count) || Predicate.isBoolean(count)) {
    return String(count)
  }
  return String(count)
}

export function getCount(count: CountInput, state: InflectorState): 1 | 2 | "" {
  const effective: CountInput =
    count === undefined || count === null ? (state.persistentCount !== null ? state.persistentCount : undefined) : count

  if (effective === undefined || effective === null) {
    return ""
  }

  const numericOne = Predicate.isNumber(effective) && effective === 1
  const asString = formatCountValue(effective)
  if (numericOne || PL_COUNT_ONE.has(asString) || (state.classical.zero && PL_COUNT_ZERO.has(asString.toLowerCase()))) {
    return 1
  }
  return 2
}

export function findPivot(words: ReadonlyArray<string>, candidates: ReadonlySet<string>): number | undefined {
  for (let i = 1; i < words.length - 1; i++) {
    const w = words[i]
    if (w !== undefined && candidates.has(w)) {
      return i
    }
  }
  return undefined
}

export function handlePrepositionalPhrase(
  phrase: string,
  transform: (word: string) => string | undefined,
  sep: string,
  candidates: ReadonlySet<string>
): string | undefined {
  const parts = phrase.split(sep)
  if (parts.length < 3) {
    return undefined
  }
  const pivot = findPivot(parts, candidates)
  if (pivot === undefined) {
    return undefined
  }
  const headOriginal = parts[pivot - 1]
  const pivotWord = parts[pivot]
  if (headOriginal === undefined || pivotWord === undefined) {
    return undefined
  }
  const transformed = transform(headOriginal) ?? headOriginal
  const prefix = parts.slice(0, pivot - 1)
  const suffix = parts.slice(pivot + 1).join(" ")

  const assemble = (head: string): string => [...prefix, [head, pivotWord, ""].join(sep)].join(" ") + suffix

  return transformed.split("|").map(assemble).join("|")
}

export function groupedFromRight(digits: string, size = 3): Array<string> {
  if (digits.length === 0) {
    return [""]
  }
  const head = ((digits.length - 1) % size) + 1
  const result: Array<string> = [digits.slice(0, head)]
  for (let i = head; i < digits.length; i += size) {
    result.push(digits.slice(i, i + size))
  }
  return result
}

export function groupThousands(integerText: string, separator: string): string {
  const first = integerText.charAt(0)
  const sign = first === "+" || first === "-" ? first : ""
  const magnitude = integerText.slice(sign.length)
  return sign + groupedFromRight(magnitude, 3).join(separator)
}

/**
 * Expand a scientific-notation numeric string (such as `"1e+20"` or `"1e-6"`)
 * into a plain decimal string without loss of precision.
 */
export function expandScientificNotation(input: string): string {
  const trimmed = input.trim()
  const match = /^([+-]?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/.exec(trimmed)
  if (match === null) {
    return trimmed
  }
  const sign = match[1] ?? ""
  const intPart = match[2] ?? "0"
  const fracPart = match[3] ?? ""
  const exp = Number(match[4])
  const digits = intPart + fracPart
  const decimalPos = intPart.length + exp

  if (decimalPos <= 0) {
    return `${sign}0.${"0".repeat(-decimalPos)}${digits}`
  }
  if (decimalPos >= digits.length) {
    return `${sign}${digits}${"0".repeat(decimalPos - digits.length)}`
  }
  return `${sign}${digits.slice(0, decimalPos)}.${digits.slice(decimalPos)}`
}

export interface RoundedDecimal {
  readonly sign: "" | "-"
  readonly whole: string
  readonly frac: string
}

/**
 * Parse a decimal string (including optional sign and scientific notation)
 * and round half-up (away from zero on ties, matching Python's `ROUND_HALF_UP`)
 * to the specified number of fractional digits.
 */
export function roundDecimalHalfUp(input: string, scale: number): RoundedDecimal | undefined {
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    return undefined
  }
  const expanded = expandScientificNotation(trimmed)
  const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))$/.exec(expanded)
  if (match === null) {
    return undefined
  }
  const rawSign = match[1] ?? ""
  const intPart = (match[2] ?? "0").replace(/^0+(?=\d)/, "")
  const fracPart = match[3] ?? match[4] ?? ""

  const paddedFrac = fracPart.padEnd(scale + 1, "0")
  const keepDigits = intPart + paddedFrac.slice(0, scale)
  const roundDigit = paddedFrac.charCodeAt(scale) - 48
  const digits = Array.from(keepDigits, (ch) => ch.charCodeAt(0) - 48)

  if (roundDigit >= 5) {
    let carry = 1
    for (let i = digits.length - 1; i >= 0 && carry > 0; i--) {
      const next = (digits[i] ?? 0) + carry
      if (next >= 10) {
        digits[i] = 0
        carry = 1
      } else {
        digits[i] = next
        carry = 0
      }
    }
    if (carry > 0) {
      digits.unshift(1)
    }
  }

  const combined = digits.map((d) => String(d)).join("")
  const wholeRaw = scale === 0 ? combined : combined.slice(0, combined.length - scale)
  const frac = scale === 0 ? "" : combined.slice(combined.length - scale).padStart(scale, "0")
  const whole = wholeRaw.replace(/^0+(?=\d)/, "") || "0"
  const isZero = whole === "0" && /^0*$/.test(frac)
  const sign: "" | "-" = rawSign === "-" && !isZero ? "-" : ""

  return { sign, whole, frac }
}
