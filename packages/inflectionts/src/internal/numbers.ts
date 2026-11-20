import * as Effect from "effect/Effect"
import * as Predicate from "effect/Predicate"

import { BadChunkingOptionError, BadNumValueError, NumOutOfRangeError } from "../Errors.ts"
import type {
  JoinOptions,
  NumberInput,
  NumberToCurrencyOptions,
  NumberToWordsOptions
} from "../Schema.ts"
import * as Data from "./data.ts"
import {
  expandScientificNotation,
  groupedFromRight,
  groupThousands,
  roundDecimalHalfUp
} from "./helpers.ts"

const DIGIT_RE = /^\d/
const INTEGER_STRING_RE = /^\s*[+-]?\d+\s*$/
const NON_DIGIT_RE = /\D/g
const WHITESPACES_COMMA_RE = /\s+,/g
const COMMA_WORD_RE = /, (\S+)\s+$/
const WHITESPACES_RE = /\s+/g

const THREE_DIGITS_WORD_RE = /(\d)(\d)(\d)(?=\D*$)/
const TWO_DIGITS_WORD_RE = /(\d)(\d)(?=\D*$)/
const ONE_DIGIT_WORD_RE = /(\d)(?=\D*$)/

interface NumberArgs {
  readonly andword: string
  readonly zero: string
  readonly one: string
}

function subOrd(val: string): string {
  const replaced = val.replace(Data.ordinal_suff, (matched) => Data.ordinal_map[matched] ?? matched)
  return replaced === val ? `${replaced}th` : replaced
}

function millWord(index: number, input: string): Effect.Effect<string, NumOutOfRangeError> {
  const word = Data.mill[index]
  if (word === undefined) {
    return Effect.fail(
      new NumOutOfRangeError({
        input,
        message: `Number magnitude exceeds supported scale (index ${index})`
      })
    )
  }
  return Effect.succeed(word)
}

const unitFn = Effect.fnUntraced(function* (
  units: number,
  mindex: number,
  input: string
): Effect.fn.Return<string, NumOutOfRangeError> {
  const m = yield* millWord(mindex, input)
  return `${Data.unit[units] ?? ""}${m}`
})

const tenFn = Effect.fnUntraced(function* (
  tens: number,
  units: number,
  mindex: number,
  input: string
): Effect.fn.Return<string, NumOutOfRangeError> {
  const m = yield* millWord(mindex, input)
  if (tens !== 1) {
    const tensPart = Data.ten[tens] ?? ""
    const hyphen = tens && units ? "-" : ""
    const unitPart = Data.unit[units] ?? ""
    return `${tensPart}${hyphen}${unitPart}${m}`
  }
  return `${Data.teen[units] ?? ""}${m}`
})

const hundFn = Effect.fnUntraced(function* (
  hundreds: number,
  tens: number,
  units: number,
  mindex: number,
  args: NumberArgs,
  input: string
): Effect.fn.Return<string, NumOutOfRangeError> {
  if (hundreds) {
    const andword = tens || units ? ` ${args.andword} ` : ""
    const t = yield* tenFn(tens, units, 0, input)
    const m = yield* millWord(mindex, input)
    return `${Data.unit[hundreds] ?? ""} hundred${andword}${t}${m}, `
  }
  if (tens || units) {
    const t = yield* tenFn(tens, units, mindex, input)
    return `${t}, `
  }
  return ""
})

function group1Sub(digit: number, args: NumberArgs): string {
  if (digit === 1) {
    return ` ${args.one}, `
  }
  if (digit) {
    return `${Data.unit[digit] ?? ""}, `
  }
  return ` ${args.zero}, `
}

function group1bSub(digit: number, args: NumberArgs): string {
  if (digit) {
    return `${Data.unit[digit] ?? ""}, `
  }
  return ` ${args.zero}, `
}

const group2Sub = Effect.fnUntraced(function* (
  tens: number,
  units: number,
  args: NumberArgs,
  input: string
): Effect.fn.Return<string, NumOutOfRangeError> {
  if (tens) {
    const t = yield* tenFn(tens, units, 0, input)
    return `${t}, `
  }
  if (units) {
    return ` ${args.zero} ${Data.unit[units] ?? ""}, `
  }
  return ` ${args.zero} ${args.zero}, `
})

const group3Sub = Effect.fnUntraced(function* (
  hundreds: number,
  tens: number,
  units: number,
  args: NumberArgs,
  input: string
): Effect.fn.Return<string, NumOutOfRangeError> {
  const hunword =
    hundreds === 1 ? ` ${args.one}` : hundreds ? (Data.unit[hundreds] ?? "") : ` ${args.zero}`
  let tenword: string
  if (tens) {
    tenword = yield* tenFn(tens, units, 0, input)
  } else if (units) {
    tenword = ` ${args.zero} ${Data.unit[units] ?? ""}`
  } else {
    tenword = ` ${args.zero} ${args.zero}`
  }
  return `${hunword} ${tenword}, `
})

const renderGroup = Effect.fnUntraced(function* (
  part: string,
  group: number,
  args: NumberArgs,
  input: string
): Effect.fn.Return<string, NumOutOfRangeError> {
  if (part.length === 1) {
    const d = Number(part)
    return group === 2 ? group1bSub(d, args) : group1Sub(d, args)
  }
  if (part.length === 2) {
    return yield* group2Sub(Number(part.charAt(0)), Number(part.charAt(1)), args, input)
  }
  return yield* group3Sub(
    Number(part.charAt(0)),
    Number(part.charAt(1)),
    Number(part.charAt(2)),
    args,
    input
  )
})

const enword = Effect.fnUntraced(function* (
  rawNum: string,
  group: number,
  args: NumberArgs,
  origInput: string
): Effect.fn.Return<string, NumOutOfRangeError> {
  if (group === 1) {
    let out = ""
    for (const ch of rawNum) {
      out += group1Sub(Number(ch), args)
    }
    return out
  }

  if (group === 2 || group === 3) {
    let out = ""
    for (const part of groupedFromRight(rawNum, group)) {
      out += yield* renderGroup(part, group, args, origInput)
    }
    return out
  }

  const stripped = rawNum.trim().replace(/^0+/, "")
  if (stripped === "") {
    return args.zero
  }
  if (stripped === "1") {
    return args.one
  }

  let current = stripped
  let millCount = 0

  while (true) {
    const match = THREE_DIGITS_WORD_RE.exec(current)
    if (match === null) {
      break
    }
    const replacement = yield* hundFn(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      millCount,
      args,
      origInput
    )
    millCount += 1
    current = current.slice(0, match.index) + replacement + current.slice(match.index + 3)
  }

  const twoMatch = TWO_DIGITS_WORD_RE.exec(current)
  if (twoMatch !== null) {
    const t = yield* tenFn(Number(twoMatch[1]), Number(twoMatch[2]), millCount, origInput)
    current = current.slice(0, twoMatch.index) + `${t}, ` + current.slice(twoMatch.index + 2)
  }

  const oneMatch = ONE_DIGIT_WORD_RE.exec(current)
  if (oneMatch !== null) {
    const u = yield* unitFn(Number(oneMatch[1]), millCount, origInput)
    current = current.slice(0, oneMatch.index) + `${u}, ` + current.slice(oneMatch.index + 1)
  }

  return current
})

function chunkNum(
  num: string,
  decimal: string | null,
  group: number
): readonly [Array<string>, boolean] {
  let chunks: Array<string>
  if (decimal !== null && decimal !== "") {
    if (group !== 0) {
      chunks = num.split(".")
    } else {
      const dotIdx = num.indexOf(".")
      chunks = dotIdx === -1 ? [num] : [num.slice(0, dotIdx), num.slice(dotIdx + 1)]
    }
  } else {
    chunks = [num]
  }

  const removed = chunks[chunks.length - 1] === ""
  const result = removed ? chunks.slice(0, -1) : chunks
  return [result, removed]
}

function getSign(num: string): "" | "plus" | "minus" {
  const first = num.trimStart().charAt(0)
  if (first === "+") {
    return "plus"
  }
  if (first === "-") {
    return "minus"
  }
  return ""
}

function renderChunks(
  chunks: ReadonlyArray<string>,
  decimal: string | null,
  comma: string
): string {
  const firstItem = chunks[0]
  if (firstItem === undefined) {
    return ""
  }
  let out = firstItem
  let first = decimal === null || !firstItem.endsWith(decimal)
  for (let i = 1; i < chunks.length; i++) {
    const nc = chunks[i]
    if (nc === undefined) {
      continue
    }
    if (decimal !== null && nc === decimal) {
      first = false
    } else if (first) {
      out += comma
    }
    out += ` ${nc}`
  }
  return out
}

export const ordinalValue = Effect.fnUntraced(function* (
  num: NumberInput
): Effect.fn.Return<string, BadNumValueError> {
  if (Predicate.isNumber(num) && !Number.isFinite(num)) {
    return yield* new BadNumValueError({
      input: String(num),
      message: "Ordinal requires a finite number"
    })
  }

  const strNum = String(num)
  const startsNumeric =
    DIGIT_RE.test(strNum) || (strNum.startsWith("-") && DIGIT_RE.test(strNum.slice(1)))

  if (!startsNumeric) {
    return subOrd(strNum)
  }

  let absInt: bigint
  if (Predicate.isNumber(num) && Number.isInteger(num)) {
    absInt = BigInt(Math.abs(num))
  } else if (Predicate.isBigInt(num)) {
    absInt = num < 0n ? -num : num
  } else if (strNum.includes(".")) {
    const lastChar = strNum.charAt(strNum.length - 1)
    if (DIGIT_RE.test(lastChar)) {
      absInt = BigInt(Number(lastChar))
    } else {
      const beforeDot = strNum.slice(0, -1)
      if (!INTEGER_STRING_RE.test(beforeDot)) {
        return yield* new BadNumValueError({
          input: strNum,
          message: `Invalid numeric ordinal input: ${strNum}`
        })
      }
      const parsed = BigInt(beforeDot.trim())
      absInt = parsed < 0n ? -parsed : parsed
    }
  } else {
    if (!INTEGER_STRING_RE.test(strNum)) {
      return yield* new BadNumValueError({
        input: strNum,
        message: `Invalid numeric ordinal input: ${strNum}`
      })
    }
    const parsed = BigInt(strNum.trim())
    absInt = parsed < 0n ? -parsed : parsed
  }

  const mod100 = Number(absInt % 100n)
  const mod10 = Number(absInt % 10n)
  const post = Data.nth[mod100] ?? Data.nth[mod10] ?? "th"
  return `${strNum}${post}`
})

interface NormalizedNumberInput {
  readonly raw: string
  readonly isNumeric: boolean
}

function normalizeNumberInput(
  num: NumberInput
): Effect.Effect<NormalizedNumberInput, BadNumValueError> {
  if (Predicate.isNumber(num)) {
    if (!Number.isFinite(num)) {
      return Effect.fail(
        new BadNumValueError({ input: String(num), message: "Expected a finite number" })
      )
    }
    const str = String(num)
    const expanded = str.includes("e") || str.includes("E") ? expandScientificNotation(str) : str
    return Effect.succeed({ raw: expanded, isNumeric: true })
  }
  if (Predicate.isBigInt(num)) {
    return Effect.succeed({ raw: num.toString(), isNumeric: true })
  }
  return Effect.succeed({ raw: num, isNumeric: false })
}

export const numberToWordsCore = Effect.fnUntraced(function* (
  num: NumberInput,
  options?: NumberToWordsOptions
): Effect.fn.Return<
  { readonly text: string; readonly list: ReadonlyArray<string> },
  BadNumValueError | BadChunkingOptionError | NumOutOfRangeError
> {
  const group = options?.group ?? 0
  const rawComma = options?.comma === undefined ? "," : options.comma
  const comma = rawComma === false || rawComma === 0 || rawComma === null ? "" : rawComma
  const andword = options?.andword ?? "and"
  const zero = options?.zero ?? "zero"
  const one = options?.one ?? "one"
  const rawDecimal = options?.decimal === undefined ? "point" : options.decimal
  const decimal: string | null =
    rawDecimal === false || rawDecimal === 0 || rawDecimal === null || rawDecimal === ""
      ? null
      : rawDecimal
  const threshold = options?.threshold

  const { raw } = yield* normalizeNumberInput(num)
  let current = raw

  // Stylistic threshold conversion
  if (threshold !== undefined) {
    const numericVal = Number(current)
    if (Number.isNaN(numericVal)) {
      return yield* new BadNumValueError({
        input: current,
        message: `Invalid numeric value for threshold: ${current}`
      })
    }
    if (numericVal > threshold) {
      const dotIdx = current.indexOf(".")
      const intPart = dotIdx === -1 ? current : current.slice(0, dotIdx)
      const fracPart = dotIdx === -1 ? undefined : current.slice(dotIdx + 1)
      const formattedInt = comma !== "" ? groupThousands(intPart, comma) : intPart
      const out = fracPart !== undefined ? `${formattedInt}.${fracPart}` : formattedInt
      return { text: out, list: [out] }
    }
  }

  if (!Number.isInteger(group) || group < 0 || group > 3) {
    return yield* new BadChunkingOptionError({
      group: Number.isFinite(group) ? group : String(group),
      message: `group must be an integer between 0 and 3, received ${group}`
    })
  }

  const sign = getSign(current)

  if (Data.nth_suff.has(current)) {
    current = zero
  }

  const myOrd = current.length >= 2 && Data.nth_suff.has(current.slice(-2))
  if (myOrd) {
    current = current.slice(0, -2)
  }

  const [chunks, finalPoint] = chunkNum(current, decimal, group)
  const loopStart = chunks[0] === "" ? 1 : 0
  let first: boolean | null = loopStart === 0

  const args: NumberArgs = { andword, zero, one }
  const processedChunks: Array<string> = loopStart === 1 ? [""] : []

  for (let i = loopStart; i < chunks.length; i++) {
    const rawChunk = chunks[i] ?? ""
    let chunk = rawChunk.replace(NON_DIGIT_RE, "")
    if (chunk === "") {
      chunk = "0"
    }

    if (group === 0 && !first) {
      chunk = yield* enword(chunk, 1, args, raw)
    } else {
      chunk = yield* enword(chunk, group, args, raw)
    }

    if (chunk.endsWith(", ")) {
      chunk = chunk.slice(0, -2)
    }
    chunk = chunk.replace(WHITESPACES_COMMA_RE, ",")

    if (group === 0 && first) {
      chunk = chunk.replace(COMMA_WORD_RE, ` ${andword} $1`)
      chunk = chunk.replace(WHITESPACES_COMMA_RE, ",")
    }
    chunk = chunk.replace(WHITESPACES_RE, " ").trim()
    if (first) {
      first = null
    }
    processedChunks.push(chunk)
  }

  const numChunks: Array<string> = []
  if (loopStart === 0 && processedChunks[0] !== undefined) {
    numChunks.push(...processedChunks[0].split(", "))
  }

  if (myOrd && numChunks.length > 0) {
    const lastIdx = numChunks.length - 1
    const lastChunk = numChunks[lastIdx]
    if (lastChunk !== undefined) {
      numChunks[lastIdx] = subOrd(lastChunk)
    }
  }

  for (let i = 1; i < processedChunks.length; i++) {
    if (decimal !== null) {
      numChunks.push(decimal)
    }
    const piece = processedChunks[i]
    if (piece !== undefined) {
      numChunks.push(...piece.split(", "))
    }
  }

  if (finalPoint && decimal !== null) {
    numChunks.push(decimal)
  }

  const list = sign !== "" ? [sign, ...numChunks] : numChunks
  const signOut = sign !== "" ? `${sign} ` : ""
  const valOut = group !== 0 ? numChunks.join(`${comma} `) : renderChunks(numChunks, decimal, comma)

  return { text: `${signOut}${valOut}`, list }
})

export const numberToCurrencyImpl = Effect.fnUntraced(function* (
  num: NumberInput,
  options?: NumberToCurrencyOptions
): Effect.fn.Return<string, BadNumValueError | NumOutOfRangeError> {
  if (Predicate.isNumber(num) && !Number.isFinite(num)) {
    return yield* new BadNumValueError({
      input: String(num),
      message: `Invalid currency amount: ${num}`
    })
  }
  const str = String(num)
  const rounded = roundDecimalHalfUp(str, 2)
  if (rounded === undefined) {
    return yield* new BadNumValueError({ input: str, message: `Invalid currency amount: ${str}` })
  }
  const wholeStr = `${rounded.sign}${rounded.whole}`
  const wholeWords = yield* numberToWordsCore(wholeStr, {
    andword: options?.andword ?? "and"
  }).pipe(
    Effect.catchTag("BadChunkingOptionError", () =>
      // Unreachable because group defaults to 0
      Effect.die(new Error("Unexpected BadChunkingOptionError with default group 0"))
    )
  )
  return `${wholeWords.text} and ${rounded.frac}/100`
})

export function joinWords(
  words: ReadonlyArray<string> | null | undefined,
  options?: JoinOptions
): string {
  if (words === null || words === undefined || words.length === 0) {
    return ""
  }
  const first = words[0]
  if (words.length === 1 && first !== undefined) {
    return first
  }

  const conjRaw = options?.conj ?? "and"
  const conjSpaced = options?.conjSpaced ?? true
  const conj = conjSpaced ? (conjRaw === "" ? " " : ` ${conjRaw} `) : conjRaw

  if (words.length === 2) {
    return `${words[0] ?? ""}${conj}${words[1] ?? ""}`
  }

  let sep = options?.sep
  if (sep === undefined) {
    sep = words.join("").includes(",") ? ";" : ","
  }
  const finalSepBase = options?.finalSep ?? sep
  const finalSep = `${finalSepBase}${conj}`

  const sepSpaced = options?.sepSpaced ?? true
  const effectiveSep = sepSpaced ? `${sep} ` : sep

  return `${words.slice(0, -1).join(effectiveSep)}${finalSep}${words[words.length - 1] ?? ""}`
}
