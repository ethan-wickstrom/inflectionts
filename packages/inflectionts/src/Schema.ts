import { Match, Schema } from "effect"

/**
 * A non-empty string representing an English word or phrase to inflect.
 */
export const Word = Schema.NonEmptyString.pipe(Schema.brand("Word"))
export type Word = (typeof Word)["Type"]

export const Gender = Schema.Literals([
  "neuter",
  "feminine",
  "masculine",
  "gender-neutral",
  "feminine or masculine",
  "masculine or feminine"
])
export type Gender = (typeof Gender)["Type"]

export const isGender = Schema.is(Gender)

export const CaseMode = Schema.Literals(["normalize", "preserve"])
export type CaseMode = (typeof CaseMode)["Type"]

export const ClassicalMode = Schema.Literals(["all", "zero", "herd", "names", "persons", "ancient"])
export type ClassicalMode = (typeof ClassicalMode)["Type"]

export const ClassicalConfig = Schema.Struct({
  all: Schema.Boolean,
  zero: Schema.Boolean,
  herd: Schema.Boolean,
  names: Schema.Boolean,
  persons: Schema.Boolean,
  ancient: Schema.Boolean
})
export type ClassicalConfig = (typeof ClassicalConfig)["Type"]

export interface ClassicalPatch {
  readonly all?: boolean | undefined
  readonly zero?: boolean | undefined
  readonly herd?: boolean | undefined
  readonly names?: boolean | undefined
  readonly persons?: boolean | undefined
  readonly ancient?: boolean | undefined
}

export const NumberGroup = Schema.Literals([0, 1, 2, 3])
export type NumberGroup = (typeof NumberGroup)["Type"]

export const ComparisonResult = Schema.TaggedUnion({
  Equal: {},
  SingularPlural: {},
  PluralSingular: {},
  PluralPlural: {},
  NotEqual: {}
})
export type ComparisonResult = (typeof ComparisonResult)["Type"]

export const ComparisonCode = Schema.Literals(["eq", "s:p", "p:s", "p:p"])
export type ComparisonCode = (typeof ComparisonCode)["Type"]

/**
 * Convert a `ComparisonResult` variant to the short code used by `jaraco/inflect`
 * (`"eq"`, `"s:p"`, `"p:s"`, `"p:p"`), or `undefined` when unequal.
 */
export const comparisonCode: (result: ComparisonResult) => ComparisonCode | undefined =
  Match.type<ComparisonResult>().pipe(
    Match.withReturnType<ComparisonCode | undefined>(),
    Match.tagsExhaustive({
      Equal: () => "eq",
      SingularPlural: () => "s:p",
      PluralSingular: () => "p:s",
      PluralPlural: () => "p:p",
      NotEqual: () => undefined
    })
  )

export type CountInput = number | string | boolean | ReadonlyArray<unknown> | null | undefined

export type NumberInput = number | bigint | string

export interface NumberToWordsOptions {
  readonly group?: number | undefined
  readonly comma?: string | false | 0 | null | undefined
  readonly andword?: string | undefined
  readonly zero?: string | undefined
  readonly one?: string | undefined
  readonly decimal?: string | false | 0 | null | undefined
  readonly threshold?: number | undefined
}

export interface NumberToCurrencyOptions {
  readonly andword?: string | undefined
}

export interface JoinOptions {
  readonly sep?: string | undefined
  readonly sepSpaced?: boolean | undefined
  readonly finalSep?: string | undefined
  readonly conj?: string | undefined
  readonly conjSpaced?: boolean | undefined
}

export interface DefNounOptions {
  readonly case?: CaseMode | undefined
}

export interface UserDefinedEntry {
  readonly pattern: string | null
  readonly replacement: string | null
}

export interface InflectorState {
  readonly classical: ClassicalConfig
  readonly persistentCount: number | null
  readonly gender: Gender
  readonly preserveCase: ReadonlySet<string>
  readonly plSbUserDefined: ReadonlyArray<UserDefinedEntry>
  readonly siSbUserDefined: ReadonlyArray<UserDefinedEntry>
  readonly plVUserDefined: ReadonlyArray<UserDefinedEntry>
  readonly plAdjUserDefined: ReadonlyArray<UserDefinedEntry>
  readonly articleUserDefined: ReadonlyArray<UserDefinedEntry>
}

export const defaultClassical: ClassicalConfig = {
  all: false,
  zero: false,
  herd: false,
  names: true,
  persons: false,
  ancient: false
}

export const allClassical: ClassicalConfig = {
  all: true,
  zero: true,
  herd: true,
  names: true,
  persons: true,
  ancient: true
}

export const noClassical: ClassicalConfig = {
  all: false,
  zero: false,
  herd: false,
  names: false,
  persons: false,
  ancient: false
}

export const defaultPreserveCase: ReadonlySet<string> = new Set(["I"])

export const defaultState: InflectorState = {
  classical: defaultClassical,
  persistentCount: null,
  gender: "neuter",
  preserveCase: defaultPreserveCase,
  plSbUserDefined: [],
  siSbUserDefined: [],
  plVUserDefined: [],
  plAdjUserDefined: [],
  articleUserDefined: []
}
