/**
 * Effect v4 `Inflector` service, layers, immutable state combinators, and service-backed operations.
 *
 * @stability stable
 * @since 0.1.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"

import {
  BadChunkingOptionError,
  BadGenderError,
  BadNumValueError,
  BadUserDefinedPatternError,
  InflectTemplateError,
  InvalidWordError,
  NumOutOfRangeError,
  UnknownClassicalModeError
} from "./Errors.ts"
import { aWord, noWord } from "./internal/articles.ts"
import {
  joinWords,
  numberToCurrencyImpl,
  numberToWordsCore,
  ordinalValue
} from "./internal/numbers.ts"
import {
  compareAdjWords,
  compareNounWords,
  compareVerbWords,
  compareWords,
  pluralAdjWord,
  pluralNounWord,
  pluralVerbWord,
  pluralWord,
  presentParticipleWord,
  singularNounWord
} from "./internal/plural.ts"
import { evaluateInflectTemplate } from "./internal/template.ts"
import {
  allClassical,
  defaultState,
  Gender,
  isInflectorState,
  noClassical,
  Word,
  type ClassicalConfig,
  type ClassicalMode,
  type ClassicalPatch,
  type ComparisonResult,
  type CountInput,
  type DefNounOptions,
  type InflectorState,
  type JoinOptions,
  type NumberInput,
  type NumberToCurrencyOptions,
  type NumberToWordsOptions
} from "./Schema.ts"

/**
 * Type-level identifier branding `InflectorService` values.
 *
 * @stability stable
 * @since 0.1.0
 */
export type TypeId = "~inflectionts/Inflector"

/**
 * Runtime type identifier branding `InflectorService` values.
 *
 * @stability stable
 * @since 0.1.0
 */
export const TypeId: TypeId = "~inflectionts/Inflector"

/**
 * Type guard verifying whether an unknown value is an `InflectorService`.
 *
 * @stability stable
 * @since 0.1.0
 */
export function isInflectorService(u: unknown): u is InflectorService {
  return Predicate.hasProperty(u, TypeId)
}

const decodeWordEffect = Schema.decodeUnknownEffect(Word)
const decodeGenderEffect = Schema.decodeUnknownEffect(Gender)

const CLASSICAL_MODES: ReadonlySet<string> = new Set<ClassicalMode>([
  "all",
  "zero",
  "herd",
  "names",
  "persons",
  "ancient"
])

const INTEGER_STR_RE = /^\s*[+-]?\d+\s*$/

const parseWord = Effect.fnUntraced(function* (
  input: string
): Effect.fn.Return<Word, InvalidWordError> {
  return yield* decodeWordEffect(input).pipe(
    Effect.mapError(
      (err) =>
        new InvalidWordError({
          input,
          message: err.message
        })
    )
  )
})

const parseOptionalWord = Effect.fnUntraced(function* (
  input: string | null
): Effect.fn.Return<Word | null, InvalidWordError> {
  if (input === null) {
    return null
  }
  return yield* parseWord(input)
})

const parseGender = Effect.fnUntraced(function* (
  input: string
): Effect.fn.Return<Gender, BadGenderError> {
  return yield* decodeGenderEffect(input).pipe(
    Effect.mapError(
      (err) =>
        new BadGenderError({
          gender: input,
          message: err.message
        })
    )
  )
})

const validatePattern = Effect.fnUntraced(function* (
  pattern: string | null
): Effect.fn.Return<void, BadUserDefinedPatternError> {
  if (pattern === null) {
    return
  }
  yield* Effect.try({
    try: () => new RegExp(pattern),
    catch: (cause) =>
      new BadUserDefinedPatternError({
        pattern,
        message:
          cause instanceof Error ? cause.message : `Invalid regular expression pattern: ${pattern}`
      })
  })
})

const validateNumberInput = Effect.fnUntraced(function* (
  input: NumberInput
): Effect.fn.Return<NumberInput, InvalidWordError> {
  if (Predicate.isString(input)) {
    return yield* parseWord(input)
  }
  return input
})

const applyClassicalImpl = Effect.fnUntraced(function* (
  state: InflectorState,
  patch?: ClassicalPatch | Readonly<Record<string, boolean>>
): Effect.fn.Return<InflectorState, UnknownClassicalModeError> {
  if (patch === undefined) {
    return { ...state, classical: allClassical }
  }
  const entries = Object.entries(patch).filter(
    (entry): entry is [string, boolean] => entry[1] !== undefined
  )
  if (entries.length === 0) {
    return { ...state, classical: allClassical }
  }

  let next: ClassicalConfig = { ...state.classical }
  if ("all" in patch && patch.all !== undefined) {
    next = patch.all ? { ...allClassical } : { ...noClassical }
  }

  for (const [key, value] of entries) {
    if (!CLASSICAL_MODES.has(key)) {
      return yield* new UnknownClassicalModeError({
        mode: key,
        message: `Unknown classical mode '${key}'`
      })
    }
    next = { ...next, [key]: value }
  }

  return { ...state, classical: next }
})

/**
 * Pure state combinator applying classical pluralization flags to an `InflectorState`.
 * Supports both data-first (`applyClassical(state, patch)`) and data-last (`applyClassical(patch)(state)`) calls.
 *
 * @stability stable
 * @since 0.1.0
 */
export const applyClassical: {
  (
    patch?: ClassicalPatch | Readonly<Record<string, boolean>>
  ): (state: InflectorState) => Effect.Effect<InflectorState, UnknownClassicalModeError>
  (
    state: InflectorState,
    patch?: ClassicalPatch | Readonly<Record<string, boolean>>
  ): Effect.Effect<InflectorState, UnknownClassicalModeError>
} = dual((args) => isInflectorState(args[0]), applyClassicalImpl)

const applyGenderImpl = Effect.fnUntraced(function* (
  state: InflectorState,
  value: string
): Effect.fn.Return<InflectorState, BadGenderError> {
  const valid = yield* parseGender(value)
  return { ...state, gender: valid }
})

/**
 * Pure state combinator setting the default singular pronoun gender.
 * Supports both data-first and data-last calls.
 *
 * @stability stable
 * @since 0.1.0
 */
export const applyGender: {
  (gender: string): (state: InflectorState) => Effect.Effect<InflectorState, BadGenderError>
  (state: InflectorState, gender: string): Effect.Effect<InflectorState, BadGenderError>
} = dual(2, applyGenderImpl)

const applyNumImpl = Effect.fnUntraced(function* (
  state: InflectorState,
  count?: number | string | null,
  show?: boolean | number | string | null
): Effect.fn.Return<{ readonly state: InflectorState; readonly output: string }, BadNumValueError> {
  if (count === undefined || count === null) {
    return {
      state: { ...state, persistentCount: null },
      output: ""
    }
  }

  let parsed: number
  if (Predicate.isNumber(count)) {
    if (!Number.isFinite(count)) {
      return yield* new BadNumValueError({
        input: String(count),
        message: `Invalid count value: ${count}`
      })
    }
    parsed = Math.trunc(count)
  } else if (INTEGER_STR_RE.test(count)) {
    parsed = Number(count.trim())
  } else {
    return yield* new BadNumValueError({ input: count, message: `Invalid count value: ${count}` })
  }

  const shouldShow = show === undefined || show === null || Boolean(show)
  return {
    state: { ...state, persistentCount: parsed },
    output: shouldShow ? String(count) : ""
  }
})

/**
 * Pure state combinator setting or clearing the persistent default count.
 * Supports both data-first and data-last calls.
 *
 * @stability stable
 * @since 0.1.0
 */
export const applyNum: {
  (
    count?: number | string | null,
    show?: boolean | number | string | null
  ): (
    state: InflectorState
  ) => Effect.Effect<{ readonly state: InflectorState; readonly output: string }, BadNumValueError>
  (
    state: InflectorState,
    count?: number | string | null,
    show?: boolean | number | string | null
  ): Effect.Effect<{ readonly state: InflectorState; readonly output: string }, BadNumValueError>
} = dual((args) => isInflectorState(args[0]), applyNumImpl)

const applyDefNounImpl = Effect.fnUntraced(function* (
  state: InflectorState,
  singular: string | null,
  pluralVal: string | null,
  options?: DefNounOptions
): Effect.fn.Return<InflectorState, InvalidWordError | BadUserDefinedPatternError> {
  const validSing = yield* parseOptionalWord(singular)
  const validPlur = yield* parseOptionalWord(pluralVal)
  yield* validatePattern(validSing)

  const caseMode = options?.case ?? "normalize"
  const nextPreserve = new Set(state.preserveCase)
  if (validSing !== null) {
    if (caseMode === "preserve") {
      nextPreserve.add(validSing)
    } else {
      nextPreserve.delete(validSing)
    }
  }

  return {
    ...state,
    preserveCase: nextPreserve,
    plSbUserDefined: [...state.plSbUserDefined, { pattern: validSing, replacement: validPlur }],
    siSbUserDefined: [...state.siSbUserDefined, { pattern: validPlur, replacement: validSing }]
  }
})

/**
 * Pure state combinator registering a custom noun plural rule.
 * Supports both data-first and data-last calls.
 *
 * @stability stable
 * @since 0.1.0
 */
export const applyDefNoun: {
  (
    singular: string | null,
    plural: string | null,
    options?: DefNounOptions
  ): (
    state: InflectorState
  ) => Effect.Effect<InflectorState, InvalidWordError | BadUserDefinedPatternError>
  (
    state: InflectorState,
    singular: string | null,
    plural: string | null,
    options?: DefNounOptions
  ): Effect.Effect<InflectorState, InvalidWordError | BadUserDefinedPatternError>
} = dual((args) => isInflectorState(args[0]), applyDefNounImpl)

const applyDefVerbImpl = Effect.fnUntraced(function* (
  state: InflectorState,
  s1: string | null,
  p1: string | null,
  s2: string | null,
  p2: string | null,
  s3: string | null,
  p3: string | null
): Effect.fn.Return<InflectorState, InvalidWordError | BadUserDefinedPatternError> {
  const vs1 = yield* parseOptionalWord(s1)
  const vp1 = yield* parseOptionalWord(p1)
  const vs2 = yield* parseOptionalWord(s2)
  const vp2 = yield* parseOptionalWord(p2)
  const vs3 = yield* parseOptionalWord(s3)
  const vp3 = yield* parseOptionalWord(p3)
  yield* validatePattern(vs1)
  yield* validatePattern(vs2)
  yield* validatePattern(vs3)

  return {
    ...state,
    plVUserDefined: [
      ...state.plVUserDefined,
      { pattern: vs1, replacement: vp1 },
      { pattern: vs2, replacement: vp2 },
      { pattern: vs3, replacement: vp3 }
    ]
  }
})

/**
 * Pure state combinator registering custom verb plural rules for 1st, 2nd, and 3rd person.
 * Supports both data-first and data-last calls.
 *
 * @stability stable
 * @since 0.1.0
 */
export const applyDefVerb: {
  (
    s1: string | null,
    p1: string | null,
    s2: string | null,
    p2: string | null,
    s3: string | null,
    p3: string | null
  ): (
    state: InflectorState
  ) => Effect.Effect<InflectorState, InvalidWordError | BadUserDefinedPatternError>
  (
    state: InflectorState,
    s1: string | null,
    p1: string | null,
    s2: string | null,
    p2: string | null,
    s3: string | null,
    p3: string | null
  ): Effect.Effect<InflectorState, InvalidWordError | BadUserDefinedPatternError>
} = dual(7, applyDefVerbImpl)

const applyDefAdjImpl = Effect.fnUntraced(function* (
  state: InflectorState,
  singular: string | null,
  pluralVal: string | null
): Effect.fn.Return<InflectorState, InvalidWordError | BadUserDefinedPatternError> {
  const validSing = yield* parseOptionalWord(singular)
  const validPlur = yield* parseOptionalWord(pluralVal)
  yield* validatePattern(validSing)
  return {
    ...state,
    plAdjUserDefined: [...state.plAdjUserDefined, { pattern: validSing, replacement: validPlur }]
  }
})

/**
 * Pure state combinator registering a custom adjective plural rule.
 * Supports both data-first and data-last calls.
 *
 * @stability stable
 * @since 0.1.0
 */
export const applyDefAdj: {
  (
    singular: string | null,
    plural: string | null
  ): (
    state: InflectorState
  ) => Effect.Effect<InflectorState, InvalidWordError | BadUserDefinedPatternError>
  (
    state: InflectorState,
    singular: string | null,
    plural: string | null
  ): Effect.Effect<InflectorState, InvalidWordError | BadUserDefinedPatternError>
} = dual(3, applyDefAdjImpl)

const applyDefArticleImpl = Effect.fnUntraced(function* (
  state: InflectorState,
  pattern: string | null,
  article: "a" | "an"
): Effect.fn.Return<InflectorState, InvalidWordError | BadUserDefinedPatternError> {
  const validPattern = yield* parseOptionalWord(pattern)
  yield* validatePattern(validPattern)
  return {
    ...state,
    articleUserDefined: [
      ...state.articleUserDefined,
      { pattern: validPattern, replacement: article }
    ]
  }
})

/**
 * Pure state combinator registering an indefinite article override (`"a"` or `"an"`).
 * Supports both data-first and data-last calls.
 *
 * @stability stable
 * @since 0.1.0
 */
export const applyDefArticle: {
  (
    pattern: string | null,
    article: "a" | "an"
  ): (
    state: InflectorState
  ) => Effect.Effect<InflectorState, InvalidWordError | BadUserDefinedPatternError>
  (
    state: InflectorState,
    pattern: string | null,
    article: "a" | "an"
  ): Effect.Effect<InflectorState, InvalidWordError | BadUserDefinedPatternError>
} = dual(3, applyDefArticleImpl)

/**
 * Service contract implemented by `Inflector`.
 *
 * @stability stable
 * @since 0.1.0
 */
export interface InflectorService {
  readonly [TypeId]: TypeId
  readonly state: Effect.Effect<InflectorState>
  readonly plural: (text: string, count?: CountInput) => Effect.Effect<string, InvalidWordError>
  readonly pluralNoun: (text: string, count?: CountInput) => Effect.Effect<string, InvalidWordError>
  readonly pluralVerb: (text: string, count?: CountInput) => Effect.Effect<string, InvalidWordError>
  readonly pluralAdj: (text: string, count?: CountInput) => Effect.Effect<string, InvalidWordError>
  readonly singularNoun: (
    text: string,
    count?: CountInput,
    gender?: string
  ) => Effect.Effect<Option.Option<string>, InvalidWordError | BadGenderError>
  readonly compare: (
    word1: string,
    word2: string
  ) => Effect.Effect<ComparisonResult, InvalidWordError>
  readonly compareNouns: (
    word1: string,
    word2: string
  ) => Effect.Effect<ComparisonResult, InvalidWordError>
  readonly compareVerbs: (
    word1: string,
    word2: string
  ) => Effect.Effect<ComparisonResult, InvalidWordError>
  readonly compareAdjs: (
    word1: string,
    word2: string
  ) => Effect.Effect<ComparisonResult, InvalidWordError>
  readonly a: (text: string, count?: CountInput) => Effect.Effect<string, InvalidWordError>
  readonly an: (text: string, count?: CountInput) => Effect.Effect<string, InvalidWordError>
  readonly no: (text: string, count?: CountInput) => Effect.Effect<string, InvalidWordError>
  readonly num: (
    count?: number | string | null,
    show?: boolean | number | string | null
  ) => Effect.Effect<string, BadNumValueError>
  readonly presentParticiple: (word: string) => Effect.Effect<string, InvalidWordError>
  readonly ordinal: (num: NumberInput) => Effect.Effect<string, InvalidWordError | BadNumValueError>
  readonly numberToWords: (
    num: NumberInput,
    options?: NumberToWordsOptions
  ) => Effect.Effect<
    string,
    InvalidWordError | BadNumValueError | BadChunkingOptionError | NumOutOfRangeError
  >
  readonly numberToWordsList: (
    num: NumberInput,
    options?: NumberToWordsOptions
  ) => Effect.Effect<
    ReadonlyArray<string>,
    InvalidWordError | BadNumValueError | BadChunkingOptionError | NumOutOfRangeError
  >
  readonly numberToCurrency: (
    num: NumberInput,
    options?: NumberToCurrencyOptions
  ) => Effect.Effect<string, InvalidWordError | BadNumValueError | NumOutOfRangeError>
  readonly join: (
    words: ReadonlyArray<string> | null | undefined,
    options?: JoinOptions
  ) => Effect.Effect<string, InvalidWordError>
  readonly inflect: (
    text: string
  ) => Effect.Effect<
    string,
    | InvalidWordError
    | BadNumValueError
    | BadChunkingOptionError
    | NumOutOfRangeError
    | BadGenderError
    | InflectTemplateError
  >
  readonly classical: (
    patch?: ClassicalPatch | Readonly<Record<string, boolean>>
  ) => Effect.Effect<void, UnknownClassicalModeError>
  readonly gender: (gender: string) => Effect.Effect<void, BadGenderError>
  readonly defnoun: (
    singular: string | null,
    plural: string | null,
    options?: DefNounOptions
  ) => Effect.Effect<void, InvalidWordError | BadUserDefinedPatternError>
  readonly defverb: (
    s1: string | null,
    p1: string | null,
    s2: string | null,
    p2: string | null,
    s3: string | null,
    p3: string | null
  ) => Effect.Effect<void, InvalidWordError | BadUserDefinedPatternError>
  readonly defadj: (
    singular: string | null,
    plural: string | null
  ) => Effect.Effect<void, InvalidWordError | BadUserDefinedPatternError>
  readonly defa: (
    pattern: string | null
  ) => Effect.Effect<void, InvalidWordError | BadUserDefinedPatternError>
  readonly defan: (
    pattern: string | null
  ) => Effect.Effect<void, InvalidWordError | BadUserDefinedPatternError>
}

/**
 * Construct an isolated `InflectorService` backed by an Effect `Ref<InflectorState>`.
 *
 * @stability stable
 * @since 0.1.0
 */
export const makeInflector = Effect.fnUntraced(function* (
  initialState: InflectorState = defaultState
): Effect.fn.Return<InflectorService> {
  const stateRef = yield* Ref.make(initialState)

  const pluralFn = Effect.fnUntraced(function* (
    text: string,
    count?: CountInput
  ): Effect.fn.Return<string, InvalidWordError> {
    const word = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    return pluralWord(word, count, state)
  })

  const pluralNounFn = Effect.fnUntraced(function* (
    text: string,
    count?: CountInput
  ): Effect.fn.Return<string, InvalidWordError> {
    const word = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    return pluralNounWord(word, count, state)
  })

  const pluralVerbFn = Effect.fnUntraced(function* (
    text: string,
    count?: CountInput
  ): Effect.fn.Return<string, InvalidWordError> {
    const word = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    return pluralVerbWord(word, count, state)
  })

  const pluralAdjFn = Effect.fnUntraced(function* (
    text: string,
    count?: CountInput
  ): Effect.fn.Return<string, InvalidWordError> {
    const word = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    return pluralAdjWord(word, count, state)
  })

  const singularNounFn = Effect.fnUntraced(function* (
    text: string,
    count?: CountInput,
    genderArg?: string
  ): Effect.fn.Return<Option.Option<string>, InvalidWordError | BadGenderError> {
    const word = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    const effectiveGender = genderArg === undefined ? state.gender : yield* parseGender(genderArg)
    return singularNounWord(word, count, effectiveGender, state)
  })

  const compareFn = Effect.fnUntraced(function* (
    word1: string,
    word2: string
  ): Effect.fn.Return<ComparisonResult, InvalidWordError> {
    const w1 = yield* parseWord(word1)
    const w2 = yield* parseWord(word2)
    const state = yield* Ref.get(stateRef)
    return compareWords(w1, w2, state)
  })

  const compareNounsFn = Effect.fnUntraced(function* (
    word1: string,
    word2: string
  ): Effect.fn.Return<ComparisonResult, InvalidWordError> {
    const w1 = yield* parseWord(word1)
    const w2 = yield* parseWord(word2)
    const state = yield* Ref.get(stateRef)
    return compareNounWords(w1, w2, state)
  })

  const compareVerbsFn = Effect.fnUntraced(function* (
    word1: string,
    word2: string
  ): Effect.fn.Return<ComparisonResult, InvalidWordError> {
    const w1 = yield* parseWord(word1)
    const w2 = yield* parseWord(word2)
    const state = yield* Ref.get(stateRef)
    return compareVerbWords(w1, w2, state)
  })

  const compareAdjsFn = Effect.fnUntraced(function* (
    word1: string,
    word2: string
  ): Effect.fn.Return<ComparisonResult, InvalidWordError> {
    const w1 = yield* parseWord(word1)
    const w2 = yield* parseWord(word2)
    const state = yield* Ref.get(stateRef)
    return compareAdjWords(w1, w2, state)
  })

  const aFn = Effect.fnUntraced(function* (
    text: string,
    count?: CountInput
  ): Effect.fn.Return<string, InvalidWordError> {
    const word = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    return aWord(word, count, state)
  })

  const noFn = Effect.fnUntraced(function* (
    text: string,
    count?: CountInput
  ): Effect.fn.Return<string, InvalidWordError> {
    const word = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    return noWord(word, count, state)
  })

  const numFn = Effect.fnUntraced(function* (
    count?: number | string | null,
    show?: boolean | number | string | null
  ): Effect.fn.Return<string, BadNumValueError> {
    const current = yield* Ref.get(stateRef)
    const updated = yield* applyNumImpl(current, count, show)
    yield* Ref.set(stateRef, updated.state)
    return updated.output
  })

  const presentParticipleFn = Effect.fnUntraced(function* (
    word: string
  ): Effect.fn.Return<string, InvalidWordError> {
    const valid = yield* parseWord(word)
    const state = yield* Ref.get(stateRef)
    return presentParticipleWord(valid, state)
  })

  const ordinalFn = Effect.fnUntraced(function* (
    input: NumberInput
  ): Effect.fn.Return<string, InvalidWordError | BadNumValueError> {
    const valid = yield* validateNumberInput(input)
    return yield* ordinalValue(valid)
  })

  const numberToWordsFn = Effect.fnUntraced(function* (
    input: NumberInput,
    options?: NumberToWordsOptions
  ): Effect.fn.Return<
    string,
    InvalidWordError | BadNumValueError | BadChunkingOptionError | NumOutOfRangeError
  > {
    const valid = yield* validateNumberInput(input)
    const result = yield* numberToWordsCore(valid, options)
    return result.text
  })

  const numberToWordsListFn = Effect.fnUntraced(function* (
    input: NumberInput,
    options?: NumberToWordsOptions
  ): Effect.fn.Return<
    ReadonlyArray<string>,
    InvalidWordError | BadNumValueError | BadChunkingOptionError | NumOutOfRangeError
  > {
    const valid = yield* validateNumberInput(input)
    const result = yield* numberToWordsCore(valid, options)
    return result.list
  })

  const numberToCurrencyFn = Effect.fnUntraced(function* (
    input: NumberInput,
    options?: NumberToCurrencyOptions
  ): Effect.fn.Return<string, InvalidWordError | BadNumValueError | NumOutOfRangeError> {
    const valid = yield* validateNumberInput(input)
    return yield* numberToCurrencyImpl(valid, options)
  })

  const joinFn = Effect.fnUntraced(function* (
    words: ReadonlyArray<string> | null | undefined,
    options?: JoinOptions
  ): Effect.fn.Return<string, InvalidWordError> {
    if (words !== null && words !== undefined) {
      for (const word of words) {
        yield* parseWord(word)
      }
    }
    return joinWords(words, options)
  })

  const inflectFn = Effect.fnUntraced(function* (text: string) {
    const valid = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    return yield* evaluateInflectTemplate(valid, state)
  })

  const classicalFn = Effect.fnUntraced(function* (
    patch?: ClassicalPatch | Readonly<Record<string, boolean>>
  ): Effect.fn.Return<void, UnknownClassicalModeError> {
    const current = yield* Ref.get(stateRef)
    const next = yield* applyClassicalImpl(current, patch)
    yield* Ref.set(stateRef, next)
  })

  const genderFn = Effect.fnUntraced(function* (
    value: string
  ): Effect.fn.Return<void, BadGenderError> {
    const current = yield* Ref.get(stateRef)
    const next = yield* applyGenderImpl(current, value)
    yield* Ref.set(stateRef, next)
  })

  const defnounFn = Effect.fnUntraced(function* (
    singular: string | null,
    pluralVal: string | null,
    options?: DefNounOptions
  ): Effect.fn.Return<void, InvalidWordError | BadUserDefinedPatternError> {
    const current = yield* Ref.get(stateRef)
    const next = yield* applyDefNounImpl(current, singular, pluralVal, options)
    yield* Ref.set(stateRef, next)
  })

  const defverbFn = Effect.fnUntraced(function* (
    s1: string | null,
    p1: string | null,
    s2: string | null,
    p2: string | null,
    s3: string | null,
    p3: string | null
  ): Effect.fn.Return<void, InvalidWordError | BadUserDefinedPatternError> {
    const current = yield* Ref.get(stateRef)
    const next = yield* applyDefVerbImpl(current, s1, p1, s2, p2, s3, p3)
    yield* Ref.set(stateRef, next)
  })

  const defadjFn = Effect.fnUntraced(function* (
    singular: string | null,
    pluralVal: string | null
  ): Effect.fn.Return<void, InvalidWordError | BadUserDefinedPatternError> {
    const current = yield* Ref.get(stateRef)
    const next = yield* applyDefAdjImpl(current, singular, pluralVal)
    yield* Ref.set(stateRef, next)
  })

  const defaFn = Effect.fnUntraced(function* (
    pattern: string | null
  ): Effect.fn.Return<void, InvalidWordError | BadUserDefinedPatternError> {
    const current = yield* Ref.get(stateRef)
    const next = yield* applyDefArticleImpl(current, pattern, "a")
    yield* Ref.set(stateRef, next)
  })

  const defanFn = Effect.fnUntraced(function* (
    pattern: string | null
  ): Effect.fn.Return<void, InvalidWordError | BadUserDefinedPatternError> {
    const current = yield* Ref.get(stateRef)
    const next = yield* applyDefArticleImpl(current, pattern, "an")
    yield* Ref.set(stateRef, next)
  })

  return {
    [TypeId]: TypeId,
    state: Ref.get(stateRef),
    plural: pluralFn,
    pluralNoun: pluralNounFn,
    pluralVerb: pluralVerbFn,
    pluralAdj: pluralAdjFn,
    singularNoun: singularNounFn,
    compare: compareFn,
    compareNouns: compareNounsFn,
    compareVerbs: compareVerbsFn,
    compareAdjs: compareAdjsFn,
    a: aFn,
    an: aFn,
    no: noFn,
    num: numFn,
    presentParticiple: presentParticipleFn,
    ordinal: ordinalFn,
    numberToWords: numberToWordsFn,
    numberToWordsList: numberToWordsListFn,
    numberToCurrency: numberToCurrencyFn,
    join: joinFn,
    inflect: inflectFn,
    classical: classicalFn,
    gender: genderFn,
    defnoun: defnounFn,
    defverb: defverbFn,
    defadj: defadjFn,
    defa: defaFn,
    defan: defanFn
  } satisfies InflectorService
})

/**
 * Effect service providing English inflection operations backed by an isolated `InflectorState`.
 *
 * @stability stable
 * @since 0.1.0
 */
export class Inflector extends Context.Service<Inflector, InflectorService>()(
  "inflectionts/Inflector"
) {
  /**
   * Default `Inflector` layer with isolated state initialized to `defaultState`.
   *
   * @stability stable
   * @since 0.1.0
   */
  static readonly layer: Layer.Layer<Inflector> = Layer.effect(Inflector, makeInflector())

  /**
   * Construct an `Inflector` layer preconfigured with a custom initial `InflectorState`.
   *
   * @stability stable
   * @since 0.1.0
   */
  static readonly layerWith = (initialState: InflectorState): Layer.Layer<Inflector> =>
    Layer.effect(Inflector, makeInflector(initialState))
}

/**
 * Read the current immutable `InflectorState` snapshot from the active `Inflector` service.
 *
 * @stability stable
 * @since 0.1.0
 */
export const getState: Effect.Effect<InflectorState, never, Inflector> = Effect.gen(function* () {
  const service = yield* Inflector
  return yield* service.state
})

/**
 * Return the plural of a word (preferring adjective, then verb, then noun rules).
 *
 * @stability stable
 * @since 0.1.0
 */
export const plural = Effect.fnUntraced(function* (text: string, count?: CountInput) {
  const service = yield* Inflector
  return yield* service.plural(text, count)
})

/**
 * Return the plural of a singular noun or pronoun.
 *
 * @stability stable
 * @since 0.1.0
 */
export const pluralNoun = Effect.fnUntraced(function* (text: string, count?: CountInput) {
  const service = yield* Inflector
  return yield* service.pluralNoun(text, count)
})

/**
 * Return the plural conjugation of a singular verb.
 *
 * @stability stable
 * @since 0.1.0
 */
export const pluralVerb = Effect.fnUntraced(function* (text: string, count?: CountInput) {
  const service = yield* Inflector
  return yield* service.pluralVerb(text, count)
})

/**
 * Return the plural form of a singular adjective or possessive.
 *
 * @stability stable
 * @since 0.1.0
 */
export const pluralAdj = Effect.fnUntraced(function* (text: string, count?: CountInput) {
  const service = yield* Inflector
  return yield* service.pluralAdj(text, count)
})

/**
 * Return the singular form of a plural noun or pronoun, or `Option.none()` if already singular.
 *
 * @stability stable
 * @since 0.1.0
 */
export const singularNoun = Effect.fnUntraced(function* (
  text: string,
  count?: CountInput,
  genderArg?: string
) {
  const service = yield* Inflector
  return yield* service.singularNoun(text, count, genderArg)
})

/**
 * Compare two words for equality regardless of grammatical number across nouns, verbs, and adjectives.
 *
 * @stability stable
 * @since 0.1.0
 */
export const compare = Effect.fnUntraced(function* (word1: string, word2: string) {
  const service = yield* Inflector
  return yield* service.compare(word1, word2)
})

/**
 * Compare two nouns for equality regardless of grammatical number.
 *
 * @stability stable
 * @since 0.1.0
 */
export const compareNouns = Effect.fnUntraced(function* (word1: string, word2: string) {
  const service = yield* Inflector
  return yield* service.compareNouns(word1, word2)
})

/**
 * Compare two verbs for equality regardless of grammatical number.
 *
 * @stability stable
 * @since 0.1.0
 */
export const compareVerbs = Effect.fnUntraced(function* (word1: string, word2: string) {
  const service = yield* Inflector
  return yield* service.compareVerbs(word1, word2)
})

/**
 * Compare two adjectives for equality regardless of grammatical number.
 *
 * @stability stable
 * @since 0.1.0
 */
export const compareAdjs = Effect.fnUntraced(function* (word1: string, word2: string) {
  const service = yield* Inflector
  return yield* service.compareAdjs(word1, word2)
})

/**
 * Prefix a word with the pronunciation-appropriate indefinite article (`"a"` or `"an"`), or the count when not singular.
 *
 * @stability stable
 * @since 0.1.0
 */
export const a = Effect.fnUntraced(function* (text: string, count?: CountInput) {
  const service = yield* Inflector
  return yield* service.a(text, count)
})

/**
 * Alias for `a`.
 *
 * @stability stable
 * @since 0.1.0
 */
export const an = a

/**
 * Format a count-prefixed phrase, replacing zero counts with `"no"`.
 *
 * @stability stable
 * @since 0.1.0
 */
export const no = Effect.fnUntraced(function* (text: string, count?: CountInput) {
  const service = yield* Inflector
  return yield* service.no(text, count)
})

/**
 * Set or clear the persistent default count on the active `Inflector` service.
 *
 * @stability stable
 * @since 0.1.0
 */
export const num = Effect.fnUntraced(function* (
  count?: number | string | null,
  show?: boolean | number | string | null
) {
  const service = yield* Inflector
  return yield* service.num(count, show)
})

/**
 * Return the present participle (`-ing` form) for a third-person singular verb.
 *
 * @stability stable
 * @since 0.1.0
 */
export const presentParticiple = Effect.fnUntraced(function* (word: string) {
  const service = yield* Inflector
  return yield* service.presentParticiple(word)
})

/**
 * Convert a numeral or number word into its English ordinal form.
 *
 * @stability stable
 * @since 0.1.0
 */
export const ordinal = Effect.fnUntraced(function* (input: NumberInput) {
  const service = yield* Inflector
  return yield* service.ordinal(input)
})

/**
 * Convert a number into English words.
 *
 * @stability stable
 * @since 0.1.0
 */
export const numberToWords = Effect.fnUntraced(function* (
  input: NumberInput,
  options?: NumberToWordsOptions
) {
  const service = yield* Inflector
  return yield* service.numberToWords(input, options)
})

/**
 * Convert a number into its list of English word chunks.
 *
 * @stability stable
 * @since 0.1.0
 */
export const numberToWordsList = Effect.fnUntraced(function* (
  input: NumberInput,
  options?: NumberToWordsOptions
) {
  const service = yield* Inflector
  return yield* service.numberToWordsList(input, options)
})

/**
 * Format a monetary amount in check-style words with cents rounded half-up to `XX/100`.
 *
 * @stability stable
 * @since 0.1.0
 */
export const numberToCurrency = Effect.fnUntraced(function* (
  input: NumberInput,
  options?: NumberToCurrencyOptions
) {
  const service = yield* Inflector
  return yield* service.numberToCurrency(input, options)
})

/**
 * Join a list of words into an English grammatical conjunction list.
 *
 * @stability stable
 * @since 0.1.0
 */
export const join = Effect.fnUntraced(function* (
  words: ReadonlyArray<string> | null | undefined,
  options?: JoinOptions
) {
  const service = yield* Inflector
  return yield* service.join(words, options)
})

/**
 * Evaluate inline inflection calls (such as `plural('cat', 3)`) inside a template string.
 *
 * @stability stable
 * @since 0.1.0
 */
export const inflect = Effect.fnUntraced(function* (text: string) {
  const service = yield* Inflector
  return yield* service.inflect(text)
})

/**
 * Enable or disable classical pluralization modes on the active `Inflector` service.
 *
 * @stability stable
 * @since 0.1.0
 */
export const classical = Effect.fnUntraced(function* (
  patch?: ClassicalPatch | Readonly<Record<string, boolean>>
) {
  const service = yield* Inflector
  return yield* service.classical(patch)
})

/**
 * Set the default pronoun gender used by `singularNoun` on the active `Inflector` service.
 *
 * @stability stable
 * @since 0.1.0
 */
export const gender = Effect.fnUntraced(function* (value: string) {
  const service = yield* Inflector
  return yield* service.gender(value)
})

/**
 * Register a custom singular-to-plural noun rule on the active `Inflector` service.
 *
 * @stability stable
 * @since 0.1.0
 */
export const defnoun = Effect.fnUntraced(function* (
  singular: string | null,
  pluralVal: string | null,
  options?: DefNounOptions
) {
  const service = yield* Inflector
  return yield* service.defnoun(singular, pluralVal, options)
})

/**
 * Register custom 1st, 2nd, and 3rd person verb plural rules on the active `Inflector` service.
 *
 * @stability stable
 * @since 0.1.0
 */
export const defverb = Effect.fnUntraced(function* (
  s1: string | null,
  p1: string | null,
  s2: string | null,
  p2: string | null,
  s3: string | null,
  p3: string | null
) {
  const service = yield* Inflector
  return yield* service.defverb(s1, p1, s2, p2, s3, p3)
})

/**
 * Register a custom adjective plural rule on the active `Inflector` service.
 *
 * @stability stable
 * @since 0.1.0
 */
export const defadj = Effect.fnUntraced(function* (
  singular: string | null,
  pluralVal: string | null
) {
  const service = yield* Inflector
  return yield* service.defadj(singular, pluralVal)
})

/**
 * Override the indefinite article to `"a"` for words matching `pattern`.
 *
 * @stability stable
 * @since 0.1.0
 */
export const defa = Effect.fnUntraced(function* (pattern: string | null) {
  const service = yield* Inflector
  return yield* service.defa(pattern)
})

/**
 * Override the indefinite article to `"an"` for words matching `pattern`.
 *
 * @stability stable
 * @since 0.1.0
 */
export const defan = Effect.fnUntraced(function* (pattern: string | null) {
  const service = yield* Inflector
  return yield* service.defan(pattern)
})
