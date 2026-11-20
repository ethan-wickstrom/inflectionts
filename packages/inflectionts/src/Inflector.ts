import { Context, Effect, Layer, Option, Predicate, Ref, Schema } from "effect"
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
import {
  allClassical,
  defaultState,
  Gender,
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
import { aWord, noWord } from "./internal/articles.ts"
import { numberToCurrencyImpl, numberToWordsCore, ordinalValue, joinWords } from "./internal/numbers.ts"
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

const parseWord = Effect.fnUntraced(function* (input: string): Effect.fn.Return<Word, InvalidWordError> {
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

const parseGender = Effect.fnUntraced(function* (input: string): Effect.fn.Return<Gender, BadGenderError> {
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
        message: cause instanceof Error ? cause.message : `Invalid regular expression pattern: ${pattern}`
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

/**
 * Pure state transition applying classical pluralization flags to an `InflectorState`.
 */
export const applyClassical = Effect.fnUntraced(function* (
  state: InflectorState,
  patch?: ClassicalPatch | Readonly<Record<string, boolean>>
): Effect.fn.Return<InflectorState, UnknownClassicalModeError> {
  if (patch === undefined) {
    return { ...state, classical: allClassical }
  }
  const entries = Object.entries(patch).filter((entry): entry is [string, boolean] => entry[1] !== undefined)
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
 * Pure state transition setting the default singular pronoun gender.
 */
export const applyGender = Effect.fnUntraced(function* (
  state: InflectorState,
  gender: string
): Effect.fn.Return<InflectorState, BadGenderError> {
  const valid = yield* parseGender(gender)
  return { ...state, gender: valid }
})

/**
 * Pure state transition setting or clearing the persistent default count.
 */
export const applyNum = Effect.fnUntraced(function* (
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
      return yield* new BadNumValueError({ input: String(count), message: `Invalid count value: ${count}` })
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
 * Pure state transition registering a custom noun plural rule.
 */
export const applyDefNoun = Effect.fnUntraced(function* (
  state: InflectorState,
  singular: string | null,
  plural: string | null,
  options?: DefNounOptions
): Effect.fn.Return<InflectorState, InvalidWordError | BadUserDefinedPatternError> {
  const validSing = yield* parseOptionalWord(singular)
  const validPlur = yield* parseOptionalWord(plural)
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
 * Pure state transition registering custom verb plural rules for 1st, 2nd, and 3rd person.
 */
export const applyDefVerb = Effect.fnUntraced(function* (
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
 * Pure state transition registering a custom adjective plural rule.
 */
export const applyDefAdj = Effect.fnUntraced(function* (
  state: InflectorState,
  singular: string | null,
  plural: string | null
): Effect.fn.Return<InflectorState, InvalidWordError | BadUserDefinedPatternError> {
  const validSing = yield* parseOptionalWord(singular)
  const validPlur = yield* parseOptionalWord(plural)
  yield* validatePattern(validSing)
  return {
    ...state,
    plAdjUserDefined: [...state.plAdjUserDefined, { pattern: validSing, replacement: validPlur }]
  }
})

/**
 * Pure state transition registering an indefinite article override (`"a"` or `"an"`).
 */
export const applyDefArticle = Effect.fnUntraced(function* (
  state: InflectorState,
  pattern: string | null,
  article: "a" | "an"
): Effect.fn.Return<InflectorState, InvalidWordError | BadUserDefinedPatternError> {
  const validPattern = yield* parseOptionalWord(pattern)
  yield* validatePattern(validPattern)
  return {
    ...state,
    articleUserDefined: [...state.articleUserDefined, { pattern: validPattern, replacement: article }]
  }
})

export interface InflectorService {
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
  readonly compare: (word1: string, word2: string) => Effect.Effect<ComparisonResult, InvalidWordError>
  readonly compareNouns: (word1: string, word2: string) => Effect.Effect<ComparisonResult, InvalidWordError>
  readonly compareVerbs: (word1: string, word2: string) => Effect.Effect<ComparisonResult, InvalidWordError>
  readonly compareAdjs: (word1: string, word2: string) => Effect.Effect<ComparisonResult, InvalidWordError>
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
  ) => Effect.Effect<string, InvalidWordError | BadNumValueError | BadChunkingOptionError | NumOutOfRangeError>
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
  readonly defa: (pattern: string | null) => Effect.Effect<void, InvalidWordError | BadUserDefinedPatternError>
  readonly defan: (pattern: string | null) => Effect.Effect<void, InvalidWordError | BadUserDefinedPatternError>
}

export const makeInflector = Effect.fnUntraced(function* (
  initialState: InflectorState = defaultState
): Effect.fn.Return<InflectorService> {
  const stateRef = yield* Ref.make(initialState)

  const plural = Effect.fnUntraced(function* (
    text: string,
    count?: CountInput
  ): Effect.fn.Return<string, InvalidWordError> {
    const word = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    return pluralWord(word, count, state)
  })

  const pluralNoun = Effect.fnUntraced(function* (
    text: string,
    count?: CountInput
  ): Effect.fn.Return<string, InvalidWordError> {
    const word = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    return pluralNounWord(word, count, state)
  })

  const pluralVerb = Effect.fnUntraced(function* (
    text: string,
    count?: CountInput
  ): Effect.fn.Return<string, InvalidWordError> {
    const word = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    return pluralVerbWord(word, count, state)
  })

  const pluralAdj = Effect.fnUntraced(function* (
    text: string,
    count?: CountInput
  ): Effect.fn.Return<string, InvalidWordError> {
    const word = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    return pluralAdjWord(word, count, state)
  })

  const singularNoun = Effect.fnUntraced(function* (
    text: string,
    count?: CountInput,
    gender?: string
  ): Effect.fn.Return<Option.Option<string>, InvalidWordError | BadGenderError> {
    const word = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    const effectiveGender = gender === undefined ? state.gender : yield* parseGender(gender)
    return singularNounWord(word, count, effectiveGender, state)
  })

  const compare = Effect.fnUntraced(function* (
    word1: string,
    word2: string
  ): Effect.fn.Return<ComparisonResult, InvalidWordError> {
    const w1 = yield* parseWord(word1)
    const w2 = yield* parseWord(word2)
    const state = yield* Ref.get(stateRef)
    return compareWords(w1, w2, state)
  })

  const compareNouns = Effect.fnUntraced(function* (
    word1: string,
    word2: string
  ): Effect.fn.Return<ComparisonResult, InvalidWordError> {
    const w1 = yield* parseWord(word1)
    const w2 = yield* parseWord(word2)
    const state = yield* Ref.get(stateRef)
    return compareNounWords(w1, w2, state)
  })

  const compareVerbs = Effect.fnUntraced(function* (
    word1: string,
    word2: string
  ): Effect.fn.Return<ComparisonResult, InvalidWordError> {
    const w1 = yield* parseWord(word1)
    const w2 = yield* parseWord(word2)
    const state = yield* Ref.get(stateRef)
    return compareVerbWords(w1, w2, state)
  })

  const compareAdjs = Effect.fnUntraced(function* (
    word1: string,
    word2: string
  ): Effect.fn.Return<ComparisonResult, InvalidWordError> {
    const w1 = yield* parseWord(word1)
    const w2 = yield* parseWord(word2)
    const state = yield* Ref.get(stateRef)
    return compareAdjWords(w1, w2, state)
  })

  const a = Effect.fnUntraced(function* (text: string, count?: CountInput): Effect.fn.Return<string, InvalidWordError> {
    const word = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    return aWord(word, count, state)
  })

  const no = Effect.fnUntraced(function* (
    text: string,
    count?: CountInput
  ): Effect.fn.Return<string, InvalidWordError> {
    const word = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    return noWord(word, count, state)
  })

  const num = Effect.fnUntraced(function* (
    count?: number | string | null,
    show?: boolean | number | string | null
  ): Effect.fn.Return<string, BadNumValueError> {
    const current = yield* Ref.get(stateRef)
    const updated = yield* applyNum(current, count, show)
    yield* Ref.set(stateRef, updated.state)
    return updated.output
  })

  const presentParticiple = Effect.fnUntraced(function* (word: string): Effect.fn.Return<string, InvalidWordError> {
    const valid = yield* parseWord(word)
    const state = yield* Ref.get(stateRef)
    return presentParticipleWord(valid, state)
  })

  const ordinal = Effect.fnUntraced(function* (
    input: NumberInput
  ): Effect.fn.Return<string, InvalidWordError | BadNumValueError> {
    const valid = yield* validateNumberInput(input)
    return yield* ordinalValue(valid)
  })

  const numberToWords = Effect.fnUntraced(function* (
    input: NumberInput,
    options?: NumberToWordsOptions
  ): Effect.fn.Return<string, InvalidWordError | BadNumValueError | BadChunkingOptionError | NumOutOfRangeError> {
    const valid = yield* validateNumberInput(input)
    const result = yield* numberToWordsCore(valid, options)
    return result.text
  })

  const numberToWordsList = Effect.fnUntraced(function* (
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

  const numberToCurrency = Effect.fnUntraced(function* (
    input: NumberInput,
    options?: NumberToCurrencyOptions
  ): Effect.fn.Return<string, InvalidWordError | BadNumValueError | NumOutOfRangeError> {
    const valid = yield* validateNumberInput(input)
    return yield* numberToCurrencyImpl(valid, options)
  })

  const join = Effect.fnUntraced(function* (
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

  const inflect = Effect.fnUntraced(function* (text: string) {
    const valid = yield* parseWord(text)
    const state = yield* Ref.get(stateRef)
    return yield* evaluateInflectTemplate(valid, state)
  })

  const classical = Effect.fnUntraced(function* (
    patch?: ClassicalPatch | Readonly<Record<string, boolean>>
  ): Effect.fn.Return<void, UnknownClassicalModeError> {
    const current = yield* Ref.get(stateRef)
    const next = yield* applyClassical(current, patch)
    yield* Ref.set(stateRef, next)
  })

  const gender = Effect.fnUntraced(function* (value: string): Effect.fn.Return<void, BadGenderError> {
    const current = yield* Ref.get(stateRef)
    const next = yield* applyGender(current, value)
    yield* Ref.set(stateRef, next)
  })

  const defnoun = Effect.fnUntraced(function* (
    singular: string | null,
    pluralVal: string | null,
    options?: DefNounOptions
  ): Effect.fn.Return<void, InvalidWordError | BadUserDefinedPatternError> {
    const current = yield* Ref.get(stateRef)
    const next = yield* applyDefNoun(current, singular, pluralVal, options)
    yield* Ref.set(stateRef, next)
  })

  const defverb = Effect.fnUntraced(function* (
    s1: string | null,
    p1: string | null,
    s2: string | null,
    p2: string | null,
    s3: string | null,
    p3: string | null
  ): Effect.fn.Return<void, InvalidWordError | BadUserDefinedPatternError> {
    const current = yield* Ref.get(stateRef)
    const next = yield* applyDefVerb(current, s1, p1, s2, p2, s3, p3)
    yield* Ref.set(stateRef, next)
  })

  const defadj = Effect.fnUntraced(function* (
    singular: string | null,
    pluralVal: string | null
  ): Effect.fn.Return<void, InvalidWordError | BadUserDefinedPatternError> {
    const current = yield* Ref.get(stateRef)
    const next = yield* applyDefAdj(current, singular, pluralVal)
    yield* Ref.set(stateRef, next)
  })

  const defa = Effect.fnUntraced(function* (
    pattern: string | null
  ): Effect.fn.Return<void, InvalidWordError | BadUserDefinedPatternError> {
    const current = yield* Ref.get(stateRef)
    const next = yield* applyDefArticle(current, pattern, "a")
    yield* Ref.set(stateRef, next)
  })

  const defan = Effect.fnUntraced(function* (
    pattern: string | null
  ): Effect.fn.Return<void, InvalidWordError | BadUserDefinedPatternError> {
    const current = yield* Ref.get(stateRef)
    const next = yield* applyDefArticle(current, pattern, "an")
    yield* Ref.set(stateRef, next)
  })

  return {
    state: Ref.get(stateRef),
    plural,
    pluralNoun,
    pluralVerb,
    pluralAdj,
    singularNoun,
    compare,
    compareNouns,
    compareVerbs,
    compareAdjs,
    a,
    an: a,
    no,
    num,
    presentParticiple,
    ordinal,
    numberToWords,
    numberToWordsList,
    numberToCurrency,
    join,
    inflect,
    classical,
    gender,
    defnoun,
    defverb,
    defadj,
    defa,
    defan
  } satisfies InflectorService
})

export class Inflector extends Context.Service<Inflector, InflectorService>()("inflectionts/Inflector") {
  /**
   * Default `Inflector` layer with isolated state initialized to `defaultState`.
   */
  static readonly layer: Layer.Layer<Inflector> = Layer.effect(Inflector, makeInflector())

  /**
   * Construct an `Inflector` layer preconfigured with a custom initial `InflectorState`.
   */
  static readonly layerWith = (initialState: InflectorState): Layer.Layer<Inflector> =>
    Layer.effect(Inflector, makeInflector(initialState))
}

// Service-accessing Effect operations

export const getState: Effect.Effect<InflectorState, never, Inflector> = Effect.gen(function* () {
  const service = yield* Inflector
  return yield* service.state
})

export const plural = Effect.fnUntraced(function* (text: string, count?: CountInput) {
  const service = yield* Inflector
  return yield* service.plural(text, count)
})

export const pluralNoun = Effect.fnUntraced(function* (text: string, count?: CountInput) {
  const service = yield* Inflector
  return yield* service.pluralNoun(text, count)
})

export const pluralVerb = Effect.fnUntraced(function* (text: string, count?: CountInput) {
  const service = yield* Inflector
  return yield* service.pluralVerb(text, count)
})

export const pluralAdj = Effect.fnUntraced(function* (text: string, count?: CountInput) {
  const service = yield* Inflector
  return yield* service.pluralAdj(text, count)
})

export const singularNoun = Effect.fnUntraced(function* (text: string, count?: CountInput, gender?: string) {
  const service = yield* Inflector
  return yield* service.singularNoun(text, count, gender)
})

export const compare = Effect.fnUntraced(function* (word1: string, word2: string) {
  const service = yield* Inflector
  return yield* service.compare(word1, word2)
})

export const compareNouns = Effect.fnUntraced(function* (word1: string, word2: string) {
  const service = yield* Inflector
  return yield* service.compareNouns(word1, word2)
})

export const compareVerbs = Effect.fnUntraced(function* (word1: string, word2: string) {
  const service = yield* Inflector
  return yield* service.compareVerbs(word1, word2)
})

export const compareAdjs = Effect.fnUntraced(function* (word1: string, word2: string) {
  const service = yield* Inflector
  return yield* service.compareAdjs(word1, word2)
})

export const a = Effect.fnUntraced(function* (text: string, count?: CountInput) {
  const service = yield* Inflector
  return yield* service.a(text, count)
})

export const an = a

export const no = Effect.fnUntraced(function* (text: string, count?: CountInput) {
  const service = yield* Inflector
  return yield* service.no(text, count)
})

export const num = Effect.fnUntraced(function* (
  count?: number | string | null,
  show?: boolean | number | string | null
) {
  const service = yield* Inflector
  return yield* service.num(count, show)
})

export const presentParticiple = Effect.fnUntraced(function* (word: string) {
  const service = yield* Inflector
  return yield* service.presentParticiple(word)
})

export const ordinal = Effect.fnUntraced(function* (input: NumberInput) {
  const service = yield* Inflector
  return yield* service.ordinal(input)
})

export const numberToWords = Effect.fnUntraced(function* (input: NumberInput, options?: NumberToWordsOptions) {
  const service = yield* Inflector
  return yield* service.numberToWords(input, options)
})

export const numberToWordsList = Effect.fnUntraced(function* (input: NumberInput, options?: NumberToWordsOptions) {
  const service = yield* Inflector
  return yield* service.numberToWordsList(input, options)
})

export const numberToCurrency = Effect.fnUntraced(function* (input: NumberInput, options?: NumberToCurrencyOptions) {
  const service = yield* Inflector
  return yield* service.numberToCurrency(input, options)
})

export const join = Effect.fnUntraced(function* (
  words: ReadonlyArray<string> | null | undefined,
  options?: JoinOptions
) {
  const service = yield* Inflector
  return yield* service.join(words, options)
})

export const inflect = Effect.fnUntraced(function* (text: string) {
  const service = yield* Inflector
  return yield* service.inflect(text)
})

export const classical = Effect.fnUntraced(function* (patch?: ClassicalPatch | Readonly<Record<string, boolean>>) {
  const service = yield* Inflector
  return yield* service.classical(patch)
})

export const gender = Effect.fnUntraced(function* (value: string) {
  const service = yield* Inflector
  return yield* service.gender(value)
})

export const defnoun = Effect.fnUntraced(function* (
  singular: string | null,
  pluralVal: string | null,
  options?: DefNounOptions
) {
  const service = yield* Inflector
  return yield* service.defnoun(singular, pluralVal, options)
})

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

export const defadj = Effect.fnUntraced(function* (singular: string | null, pluralVal: string | null) {
  const service = yield* Inflector
  return yield* service.defadj(singular, pluralVal)
})

export const defa = Effect.fnUntraced(function* (pattern: string | null) {
  const service = yield* Inflector
  return yield* service.defa(pattern)
})

export const defan = Effect.fnUntraced(function* (pattern: string | null) {
  const service = yield* Inflector
  return yield* service.defan(pattern)
})
