/**
 * Executable Effect schemas, branded domain types, and immutable state models for `inflectionts`.
 *
 * @stability stable
 * @since 0.1.0
 */
import * as Match from "effect/Match"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"

/**
 * Type-level identifier branding `InflectorState` values.
 *
 * @stability stable
 * @since 0.1.0
 */
export type StateTypeId = "~inflectionts/InflectorState"

/**
 * Runtime type identifier branding `InflectorState` values.
 *
 * @stability stable
 * @since 0.1.0
 */
export const StateTypeId: StateTypeId = "~inflectionts/InflectorState"

/**
 * A non-empty string representing an English word or phrase to inflect.
 *
 * @stability stable
 * @since 0.1.0
 */
export const Word = Schema.NonEmptyString.pipe(Schema.brand("Word"))

/**
 * Branded non-empty English word or phrase.
 *
 * @stability stable
 * @since 0.1.0
 */
export type Word = (typeof Word)["Type"]

/**
 * Schema of supported grammatical genders for singularizing third-person plural pronouns.
 *
 * @stability stable
 * @since 0.1.0
 */
export const Gender = Schema.Literals([
  "neuter",
  "feminine",
  "masculine",
  "gender-neutral",
  "feminine or masculine",
  "masculine or feminine"
])

/**
 * Supported grammatical gender literal union.
 *
 * @stability stable
 * @since 0.1.0
 */
export type Gender = (typeof Gender)["Type"]

/**
 * Type guard verifying whether a value is a valid `Gender`.
 *
 * @stability stable
 * @since 0.1.0
 */
export const isGender = Schema.is(Gender)

/**
 * Schema controlling whether custom noun plural capitalization is normalized or preserved.
 *
 * @stability stable
 * @since 0.1.0
 */
export const CaseMode = Schema.Literals(["normalize", "preserve"])

/**
 * Custom noun case handling mode.
 *
 * @stability stable
 * @since 0.1.0
 */
export type CaseMode = (typeof CaseMode)["Type"]

/**
 * Schema of classical pluralization category names.
 *
 * @stability stable
 * @since 0.1.0
 */
export const ClassicalMode = Schema.Literals(["all", "zero", "herd", "names", "persons", "ancient"])

/**
 * Classical pluralization category name.
 *
 * @stability stable
 * @since 0.1.0
 */
export type ClassicalMode = (typeof ClassicalMode)["Type"]

/**
 * Schema for complete classical pluralization settings.
 *
 * @stability stable
 * @since 0.1.0
 */
export const ClassicalConfig = Schema.Struct({
  all: Schema.Boolean,
  zero: Schema.Boolean,
  herd: Schema.Boolean,
  names: Schema.Boolean,
  persons: Schema.Boolean,
  ancient: Schema.Boolean
})

/**
 * Complete classical pluralization flag configuration.
 *
 * @stability stable
 * @since 0.1.0
 */
export type ClassicalConfig = (typeof ClassicalConfig)["Type"]

/**
 * Partial classical pluralization patch passed to `classical` or `applyClassical`.
 *
 * @stability stable
 * @since 0.1.0
 */
export interface ClassicalPatch {
  readonly all?: boolean | undefined
  readonly zero?: boolean | undefined
  readonly herd?: boolean | undefined
  readonly names?: boolean | undefined
  readonly persons?: boolean | undefined
  readonly ancient?: boolean | undefined
}

/**
 * Schema of valid digit-grouping widths for `numberToWords`.
 *
 * @stability stable
 * @since 0.1.0
 */
export const NumberGroup = Schema.Literals([0, 1, 2, 3])

/**
 * Valid digit-grouping width (`0`, `1`, `2`, or `3`).
 *
 * @stability stable
 * @since 0.1.0
 */
export type NumberGroup = (typeof NumberGroup)["Type"]

/**
 * Tagged union describing number-insensitive word comparison outcomes.
 *
 * @stability stable
 * @since 0.1.0
 */
export const ComparisonResult = Schema.TaggedUnion({
  Equal: {},
  SingularPlural: {},
  PluralSingular: {},
  PluralPlural: {},
  NotEqual: {}
})

/**
 * Result of comparing two words regardless of plurality.
 *
 * @stability stable
 * @since 0.1.0
 */
export type ComparisonResult = (typeof ComparisonResult)["Type"]

/**
 * Short comparison code schema matching `jaraco/inflect` (`"eq"`, `"s:p"`, `"p:s"`, `"p:p"`).
 *
 * @stability stable
 * @since 0.1.0
 */
export const ComparisonCode = Schema.Literals(["eq", "s:p", "p:s", "p:p"])

/**
 * Short comparison code literal union.
 *
 * @stability stable
 * @since 0.1.0
 */
export type ComparisonCode = (typeof ComparisonCode)["Type"]

/**
 * Convert a `ComparisonResult` variant to the short code used by `jaraco/inflect`
 * (`"eq"`, `"s:p"`, `"p:s"`, `"p:p"`), or `undefined` when unequal.
 *
 * @stability stable
 * @since 0.1.0
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

/**
 * Accepted count inputs for conditional inflection operations.
 *
 * @stability stable
 * @since 0.1.0
 */
export type CountInput = number | string | boolean | ReadonlyArray<unknown> | null | undefined

/**
 * Accepted numeric inputs for `ordinal`, `numberToWords`, and `numberToCurrency`.
 *
 * @stability stable
 * @since 0.1.0
 */
export type NumberInput = number | bigint | string

/**
 * Options for `numberToWords` and `numberToWordsList`.
 *
 * @stability stable
 * @since 0.1.0
 */
export interface NumberToWordsOptions {
  readonly group?: number | undefined
  readonly comma?: string | false | 0 | null | undefined
  readonly andword?: string | undefined
  readonly zero?: string | undefined
  readonly one?: string | undefined
  readonly decimal?: string | false | 0 | null | undefined
  readonly threshold?: number | undefined
}

/**
 * Options for `numberToCurrency`.
 *
 * @stability stable
 * @since 0.1.0
 */
export interface NumberToCurrencyOptions {
  readonly andword?: string | undefined
}

/**
 * Options for `join`.
 *
 * @stability stable
 * @since 0.1.0
 */
export interface JoinOptions {
  readonly sep?: string | undefined
  readonly sepSpaced?: boolean | undefined
  readonly finalSep?: string | undefined
  readonly conj?: string | undefined
  readonly conjSpaced?: boolean | undefined
}

/**
 * Options for `defnoun` and `applyDefNoun`.
 *
 * @stability stable
 * @since 0.1.0
 */
export interface DefNounOptions {
  readonly case?: CaseMode | undefined
}

/**
 * User-defined pattern-to-replacement override entry.
 *
 * @stability stable
 * @since 0.1.0
 */
export interface UserDefinedEntry {
  readonly pattern: string | null
  readonly replacement: string | null
}

/**
 * Immutable configuration and rule snapshot owned by an `Inflector` instance.
 *
 * @stability stable
 * @since 0.1.0
 */
export interface InflectorState {
  readonly [StateTypeId]: StateTypeId
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

/**
 * Type guard verifying whether an unknown value is an `InflectorState`.
 *
 * @stability stable
 * @since 0.1.0
 */
export function isInflectorState(u: unknown): u is InflectorState {
  return Predicate.hasProperty(u, StateTypeId)
}

/**
 * Default classical pluralization settings (all categories off except `names`).
 *
 * @stability stable
 * @since 0.1.0
 */
export const defaultClassical: ClassicalConfig = {
  all: false,
  zero: false,
  herd: false,
  names: true,
  persons: false,
  ancient: false
}

/**
 * Classical pluralization settings with every category enabled.
 *
 * @stability stable
 * @since 0.1.0
 */
export const allClassical: ClassicalConfig = {
  all: true,
  zero: true,
  herd: true,
  names: true,
  persons: true,
  ancient: true
}

/**
 * Classical pluralization settings with every category disabled.
 *
 * @stability stable
 * @since 0.1.0
 */
export const noClassical: ClassicalConfig = {
  all: false,
  zero: false,
  herd: false,
  names: false,
  persons: false,
  ancient: false
}

/**
 * Default set of nouns/pronouns whose intrinsic capitalization is preserved by `postprocess`.
 *
 * @stability stable
 * @since 0.1.0
 */
export const defaultPreserveCase: ReadonlySet<string> = new Set(["I"])

/**
 * Default immutable `InflectorState`.
 *
 * @stability stable
 * @since 0.1.0
 */
export const defaultState: InflectorState = {
  [StateTypeId]: StateTypeId,
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
