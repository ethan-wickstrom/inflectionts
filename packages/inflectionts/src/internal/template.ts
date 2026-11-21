import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"

import {
  BadChunkingOptionError,
  BadGenderError,
  BadNumValueError,
  InflectTemplateError,
  InvalidWordError,
  NumOutOfRangeError
} from "../Errors.ts"
import type { CountInput, InflectorState, NumberInput, NumberToWordsOptions } from "../Schema.ts"
import { Gender, isGender } from "../Schema.ts"
import { aWord, noWord } from "./articles.ts"
import { numberToWordsCore, ordinalValue } from "./numbers.ts"
import {
  pluralAdjWord,
  pluralNounWord,
  pluralVerbWord,
  pluralWord,
  presentParticipleWord,
  singularNounWord
} from "./plural.ts"

const IDENT_BEFORE_PAREN_RE = /([A-Za-z_][A-Za-z0-9_]*)\(/g

function findMatchingCloseParen(text: string, openParenIdx: number): number {
  let depth = 0
  let inQuote: "'" | '"' | null = null
  for (let i = openParenIdx; i < text.length; i++) {
    const ch = text.charAt(i)
    if (inQuote !== null) {
      if (ch === "\\") {
        i += 1
        continue
      }
      if (ch === inQuote) {
        inQuote = null
      }
      continue
    }
    if (ch === "'" || ch === '"') {
      inQuote = ch
    } else if (ch === "(") {
      depth += 1
    } else if (ch === ")") {
      depth -= 1
      if (depth === 0) {
        return i
      }
    }
  }
  return -1
}

const ALLOWED_METHODS: ReadonlySet<string> = new Set([
  "plural",
  "plural_adj",
  "plural_noun",
  "plural_verb",
  "singular_noun",
  "a",
  "an",
  "no",
  "ordinal",
  "number_to_words",
  "present_participle",
  "num"
])

type LiteralValue =
  | string
  | number
  | boolean
  | null
  | { readonly _tag: "List"; readonly items: ReadonlyArray<LiteralValue> }
  | { readonly _tag: "Tuple"; readonly items: ReadonlyArray<LiteralValue> }

interface ParsedCallArgs {
  readonly positional: ReadonlyArray<LiteralValue>
  readonly keywords: ReadonlyMap<string, LiteralValue>
}

class Parser {
  private pos = 0
  private readonly input: string

  constructor(input: string) {
    this.input = input
  }

  private skipWs(): void {
    while (this.pos < this.input.length && /\s/.test(this.input.charAt(this.pos))) {
      this.pos += 1
    }
  }

  private peek(): string {
    return this.input.charAt(this.pos)
  }

  private fail(message: string): Effect.Effect<never, InflectTemplateError> {
    return Effect.fail(new InflectTemplateError({ expression: this.input, message }))
  }

  parseArgs = Effect.fnUntraced(function* (
    this: Parser
  ): Effect.fn.Return<ParsedCallArgs, InflectTemplateError> {
    const positional: Array<LiteralValue> = []
    const keywords = new Map<string, LiteralValue>()
    let seenKeyword = false

    this.skipWs()
    while (this.pos < this.input.length) {
      const saved = this.pos
      const kwName = this.tryReadKeywordName()
      if (kwName !== undefined) {
        seenKeyword = true
        const val = yield* this.parseValue()
        keywords.set(kwName, val)
      } else {
        this.pos = saved
        if (seenKeyword) {
          return yield* this.fail("Positional argument cannot follow keyword argument")
        }
        const val = yield* this.parseValue()
        positional.push(val)
      }

      this.skipWs()
      if (this.pos < this.input.length) {
        if (this.peek() !== ",") {
          return yield* this.fail(`Expected ',' at position ${this.pos}`)
        }
        this.pos += 1
        this.skipWs()
      }
    }

    return { positional, keywords }
  })

  private tryReadKeywordName(): string | undefined {
    this.skipWs()
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)/.exec(this.input.slice(this.pos))
    if (match === null || match[1] === undefined) {
      return undefined
    }
    this.pos += match[0].length
    return match[1]
  }

  parseValue = Effect.fnUntraced(function* (
    this: Parser
  ): Effect.fn.Return<LiteralValue, InflectTemplateError> {
    this.skipWs()
    if (this.pos >= this.input.length) {
      return yield* this.fail("Unexpected end of arguments")
    }

    const ch = this.peek()

    if (ch === "'" || ch === '"') {
      return yield* this.parseString(ch)
    }

    if (ch === "[") {
      return yield* this.parseSequence("]", "List")
    }

    if (ch === "(") {
      return yield* this.parseSequence(")", "Tuple")
    }

    if (ch === "+" || ch === "-" || (ch >= "0" && ch <= "9")) {
      return yield* this.parseNumber()
    }

    const identMatch = /^([A-Za-z_][A-Za-z0-9_]*)/.exec(this.input.slice(this.pos))
    if (identMatch !== null && identMatch[1] !== undefined) {
      const ident = identMatch[1]
      this.pos += ident.length
      if (ident === "True" || ident === "true") {
        return true
      }
      if (ident === "False" || ident === "false") {
        return false
      }
      if (ident === "None" || ident === "null") {
        return null
      }
      return yield* this.fail(`name '${ident}' is not defined`)
    }

    return yield* this.fail(`Unexpected token '${ch}' at position ${this.pos}`)
  })

  private parseString = Effect.fnUntraced(function* (
    this: Parser,
    quote: string
  ): Effect.fn.Return<string, InflectTemplateError> {
    this.pos += 1 // skip opening quote
    let out = ""
    while (this.pos < this.input.length) {
      const ch = this.peek()
      if (ch === "\\") {
        this.pos += 1
        if (this.pos >= this.input.length) {
          return yield* this.fail("Unterminated escape sequence in string literal")
        }
        const esc = this.peek()
        this.pos += 1
        if (esc === "n") {
          out += "\n"
        } else if (esc === "t") {
          out += "\t"
        } else if (esc === "r") {
          out += "\r"
        } else {
          out += esc
        }
        continue
      }
      if (ch === quote) {
        this.pos += 1
        return out
      }
      out += ch
      this.pos += 1
    }
    return yield* this.fail("Unterminated string literal")
  })

  private parseNumber = Effect.fnUntraced(function* (
    this: Parser
  ): Effect.fn.Return<number, InflectTemplateError> {
    const rest = this.input.slice(this.pos)
    const match =
      /^([+-])?(?:\d+(?:_\d+)*(?:\.\d+(?:_\d+)*)?|\.\d+(?:_\d+)*)(?:[eE][+-]?\d+)?/.exec(rest)
    if (match === null) {
      return yield* this.fail(`Invalid numeric literal at position ${this.pos}`)
    }
    const raw = match[0]
    this.pos += raw.length
    this.skipWs()
    // Reject trailing binary operators like `1 + 2`
    const next = this.peek()
    if (next !== "" && next !== "," && next !== "]" && next !== ")") {
      return yield* this.fail(`Unexpected trailing token '${next}' after numeric literal`)
    }
    const cleaned = raw.replaceAll("_", "")
    const value = Number(cleaned)
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      return yield* this.fail(`Invalid numeric literal '${raw}'`)
    }
    return value
  })

  private parseSequence = Effect.fnUntraced(function* (
    this: Parser,
    closing: "]" | ")",
    tag: "List" | "Tuple"
  ): Effect.fn.Return<LiteralValue, InflectTemplateError> {
    this.pos += 1 // skip opening bracket/paren
    const items: Array<LiteralValue> = []
    this.skipWs()
    while (this.pos < this.input.length && this.peek() !== closing) {
      const item = yield* this.parseValue()
      items.push(item)
      this.skipWs()
      if (this.peek() === ",") {
        this.pos += 1
        this.skipWs()
      } else if (this.peek() !== closing) {
        return yield* this.fail(`Expected ',' or '${closing}' at position ${this.pos}`)
      }
    }
    if (this.peek() !== closing) {
      return yield* this.fail(`Expected '${closing}' at position ${this.pos}`)
    }
    this.pos += 1
    return { _tag: tag, items }
  })
}

function formatPythonLiteral(val: LiteralValue): string {
  if (val === null) {
    return "None"
  }
  if (Predicate.isBoolean(val)) {
    return val ? "True" : "False"
  }
  if (Predicate.isNumber(val)) {
    return String(val)
  }
  if (Predicate.isString(val)) {
    return `'${val}'`
  }
  const inner = val.items.map(formatPythonLiteral).join(", ")
  if (val._tag === "Tuple") {
    return val.items.length === 1 ? `(${inner},)` : `(${inner})`
  }
  return `[${inner}]`
}

function literalToCount(val: LiteralValue | undefined): CountInput {
  if (val === undefined || val === null) {
    return undefined
  }
  if (Predicate.isString(val) || Predicate.isNumber(val) || Predicate.isBoolean(val)) {
    return val
  }
  // Preserve Python tuple/list stringification for `an('error', ('a', 'b', 'c'))`
  return formatPythonLiteral(val)
}

function requireWord(
  val: LiteralValue | undefined,
  expression: string
): Effect.Effect<string, InvalidWordError> {
  if (!Predicate.isString(val) || val.length === 0) {
    return Effect.fail(
      new InvalidWordError({
        input: val === undefined ? "" : formatPythonLiteral(val),
        message: `Expected non-empty word string in ${expression}`
      })
    )
  }
  return Effect.succeed(val)
}

function requireNumberInput(
  val: LiteralValue | undefined,
  expression: string
): Effect.Effect<NumberInput, BadNumValueError | InvalidWordError> {
  if (Predicate.isNumber(val)) {
    return Effect.succeed(val)
  }
  if (Predicate.isString(val)) {
    if (val.length === 0) {
      return Effect.fail(
        new InvalidWordError({ input: "", message: `Empty word in ${expression}` })
      )
    }
    return Effect.succeed(val)
  }
  const formatted = val === undefined ? "undefined" : formatPythonLiteral(val)
  return Effect.fail(
    new BadNumValueError({ input: formatted, message: `Expected number or word in ${expression}` })
  )
}

export type InflectTemplateAllErrors =
  | InvalidWordError
  | BadNumValueError
  | BadChunkingOptionError
  | NumOutOfRangeError
  | BadGenderError
  | InflectTemplateError

export const evaluateInflectTemplate = Effect.fnUntraced(function* (
  text: string,
  initialState: InflectorState
): Effect.fn.Return<string, InflectTemplateAllErrors> {
  // Note: persistentCount changes inside the template are strictly scoped to
  // this evaluation and never escape to the caller's state.
  let workingState: InflectorState = initialState

  let output = ""
  let cursor = 0

  while (cursor < text.length) {
    IDENT_BEFORE_PAREN_RE.lastIndex = cursor
    const match = IDENT_BEFORE_PAREN_RE.exec(text)
    if (match === null) {
      output += text.slice(cursor)
      break
    }

    const matchStart = match.index
    const fnName = match[1] ?? ""
    const openParenIdx = matchStart + fnName.length
    const closeParenIdx = findMatchingCloseParen(text, openParenIdx)

    if (closeParenIdx === -1) {
      output += text.slice(cursor)
      break
    }

    const fullMatch = text.slice(matchStart, closeParenIdx + 1)
    const rawArgs = text.slice(openParenIdx + 1, closeParenIdx)

    output += text.slice(cursor, matchStart)
    cursor = closeParenIdx + 1

    if (!ALLOWED_METHODS.has(fnName)) {
      output += fullMatch
      continue
    }

    const parser = new Parser(rawArgs)
    const parsed = yield* parser.parseArgs()
    const pos = parsed.positional
    const kw = parsed.keywords

    const getArg = (index: number, name: string): LiteralValue | undefined =>
      kw.get(name) ?? pos[index]

    switch (fnName) {
      case "plural": {
        const word = yield* requireWord(getArg(0, "text"), fullMatch)
        const count = literalToCount(getArg(1, "count"))
        output += pluralWord(word, count, workingState)
        break
      }
      case "plural_noun": {
        const word = yield* requireWord(getArg(0, "text"), fullMatch)
        const count = literalToCount(getArg(1, "count"))
        output += pluralNounWord(word, count, workingState)
        break
      }
      case "plural_verb": {
        const word = yield* requireWord(getArg(0, "text"), fullMatch)
        const count = literalToCount(getArg(1, "count"))
        output += pluralVerbWord(word, count, workingState)
        break
      }
      case "plural_adj": {
        const word = yield* requireWord(getArg(0, "text"), fullMatch)
        const count = literalToCount(getArg(1, "count"))
        output += pluralAdjWord(word, count, workingState)
        break
      }
      case "singular_noun": {
        const word = yield* requireWord(getArg(0, "text"), fullMatch)
        const count = literalToCount(getArg(1, "count"))
        const genderRaw = getArg(2, "gender")
        let gender: Gender = workingState.gender
        if (genderRaw !== undefined && genderRaw !== null) {
          if (!Predicate.isString(genderRaw) || !isGender(genderRaw)) {
            const formatted = formatPythonLiteral(genderRaw)
            return yield* new BadGenderError({
              gender: formatted,
              message: `Invalid gender ${formatted}; expected one of: ${Gender.literals.join(", ")}`
            })
          }
          gender = genderRaw
        }
        const sing = singularNounWord(word, count, gender, workingState)
        output += Option.getOrElse(sing, () => word)
        break
      }
      case "a":
      case "an": {
        const word = yield* requireWord(getArg(0, "text"), fullMatch)
        const countArg = getArg(1, "count")
        const count = countArg === undefined ? 1 : literalToCount(countArg)
        output += aWord(word, count, workingState)
        break
      }
      case "no": {
        const word = yield* requireWord(getArg(0, "text"), fullMatch)
        const count = literalToCount(getArg(1, "count"))
        output += noWord(word, count, workingState)
        break
      }
      case "present_participle": {
        const word = yield* requireWord(getArg(0, "word"), fullMatch)
        output += presentParticipleWord(word, workingState)
        break
      }
      case "ordinal": {
        const numVal = yield* requireNumberInput(getArg(0, "num"), fullMatch)
        output += yield* ordinalValue(numVal)
        break
      }
      case "number_to_words": {
        const numVal = yield* requireNumberInput(getArg(0, "num"), fullMatch)
        const groupVal = getArg(2, "group")
        const commaVal = getArg(3, "comma")
        const andwordVal = getArg(4, "andword")
        const zeroVal = getArg(5, "zero")
        const oneVal = getArg(6, "one")
        const decimalVal = getArg(7, "decimal")
        const thresholdVal = getArg(8, "threshold")

        const opts: NumberToWordsOptions = {
          group: Predicate.isNumber(groupVal) ? groupVal : undefined,
          comma:
            Predicate.isString(commaVal) ||
            commaVal === false ||
            commaVal === 0 ||
            commaVal === null
              ? commaVal
              : undefined,
          andword: Predicate.isString(andwordVal) ? andwordVal : undefined,
          zero: Predicate.isString(zeroVal) ? zeroVal : undefined,
          one: Predicate.isString(oneVal) ? oneVal : undefined,
          decimal:
            Predicate.isString(decimalVal) ||
            decimalVal === false ||
            decimalVal === 0 ||
            decimalVal === null
              ? decimalVal
              : undefined,
          threshold: Predicate.isNumber(thresholdVal) ? thresholdVal : undefined
        }
        const res = yield* numberToWordsCore(numVal, opts)
        output += res.text
        break
      }
      case "num": {
        const countVal = getArg(0, "count")
        const showVal = getArg(1, "show")
        if (countVal === undefined || countVal === null) {
          workingState = { ...workingState, persistentCount: null }
        } else {
          let parsedInt: number
          if (Predicate.isNumber(countVal) && Number.isFinite(countVal)) {
            parsedInt = Math.trunc(countVal)
          } else if (Predicate.isString(countVal) && /^\s*[+-]?\d+\s*$/.test(countVal)) {
            parsedInt = Number(countVal.trim())
          } else {
            const formatted = formatPythonLiteral(countVal)
            return yield* new BadNumValueError({
              input: formatted,
              message: `Invalid count value for num(): ${formatted}`
            })
          }
          workingState = { ...workingState, persistentCount: parsedInt }
          const show =
            showVal === undefined ||
            showVal === null ||
            (Predicate.isBoolean(showVal)
              ? showVal
              : Predicate.isNumber(showVal)
                ? showVal !== 0
                : showVal !== "")
          if (show) {
            output += String(countVal)
          }
        }
        break
      }
    }
  }

  return output
})
