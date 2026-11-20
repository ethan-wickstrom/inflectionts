import type { CountInput, InflectorState } from "../Schema.ts"
import * as Data from "./data.ts"
import { formatCountValue, getCount, partitionWord, PL_COUNT_ZERO, udMatch } from "./helpers.ts"
import { pluralWord } from "./plural.ts"

const INDEFINITE_ARTICLE_TEST_RE = /^(\s*)(?:an?\s+)?(.+?)(\s*)$/i
const SPECIAL_AN_RE = /^[aefhilmnorsx]$/i
const SPECIAL_A_RE = /^[bcdgjkpqtuvwyz]$/i
const SPECIAL_ABBREV_AN_RE = /^[aefhilmnorsx][.-]/i
const SPECIAL_ABBREV_A_RE = /^[a-z][.-]/i
const CONSONANTS_RE = /^[^aeiouy]/i
const ARTICLE_SPECIAL_EU_RE = /^e[uw]/i
const ARTICLE_SPECIAL_ONCE_RE = /^onc?e\b/i
const ARTICLE_SPECIAL_ONETIME_RE = /^onetime\b/i
const ARTICLE_SPECIAL_UNIT_RE = /^uni([^nmd]|mo)/i
const ARTICLE_SPECIAL_UBA_RE = /^u[bcfghjkqrst][aeiou]/i
const ARTICLE_SPECIAL_UKR_RE = /^ukr/i
const SPECIAL_CAPITALS_RE = /^U[NK][AIEO]?/
const VOWELS_RE = /^[aeiou]/i

const INDEF_ARTICLE_CASES: ReadonlyArray<readonly [RegExp, "a" | "an"]> = [
  // Ordinal forms
  [Data.A_ordinal_a, "a"],
  [Data.A_ordinal_an, "an"],
  // Special cases
  [Data.A_explicit_an, "an"],
  [SPECIAL_AN_RE, "an"],
  [SPECIAL_A_RE, "a"],
  // Abbreviations
  [Data.A_abbrev, "an"],
  [SPECIAL_ABBREV_AN_RE, "an"],
  [SPECIAL_ABBREV_A_RE, "a"],
  // Consonants
  [CONSONANTS_RE, "a"],
  // Special vowel-forms
  [ARTICLE_SPECIAL_EU_RE, "a"],
  [ARTICLE_SPECIAL_ONCE_RE, "a"],
  [ARTICLE_SPECIAL_ONETIME_RE, "a"],
  [ARTICLE_SPECIAL_UNIT_RE, "a"],
  [ARTICLE_SPECIAL_UBA_RE, "a"],
  [ARTICLE_SPECIAL_UKR_RE, "a"],
  [Data.A_explicit_a, "a"],
  // Special capitals
  [SPECIAL_CAPITALS_RE, "a"],
  // Vowels
  [VOWELS_RE, "an"],
  // y before certain consonants implies "i.." sound
  [Data.A_y_cons, "an"]
]

export function indefArticle(word: string, count: CountInput, state: InflectorState): string {
  const myCount = getCount(count, state)
  if (myCount !== 1) {
    return `${formatCountValue(count)} ${word}`
  }

  const userDefined = udMatch(word, state.articleUserDefined)
  if (userDefined !== undefined) {
    return `${userDefined} ${word}`
  }

  for (const [regex, article] of INDEF_ARTICLE_CASES) {
    if (regex.test(word)) {
      return `${article} ${word}`
    }
  }

  return `a ${word}`
}

export function aWord(text: string, count: CountInput, state: InflectorState): string {
  const effectiveCount = count === undefined ? 1 : count
  const match = INDEFINITE_ARTICLE_TEST_RE.exec(text)
  if (match === null) {
    return ""
  }
  const word = match[2] ?? ""
  if (word === "") {
    return text
  }
  const pre = match[1] ?? ""
  const post = match[3] ?? ""
  return `${pre}${indefArticle(word, effectiveCount, state)}${post}`
}

export function noWord(text: string, count: CountInput, state: InflectorState): string {
  let effectiveCount: CountInput =
    count === undefined || count === null
      ? state.persistentCount !== null
        ? state.persistentCount
        : 0
      : count

  const [pre, word, post] = partitionWord(text)
  const countStr = formatCountValue(effectiveCount)
  if (PL_COUNT_ZERO.has(countStr.toLowerCase())) {
    effectiveCount = "no"
  }
  return `${pre}${formatCountValue(effectiveCount)} ${pluralWord(word, effectiveCount, state)}${post}`
}
