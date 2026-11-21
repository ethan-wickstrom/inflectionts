/**
 * Typed domain errors for `inflectionts`.
 *
 * @stability stable
 * @since 0.1.0
 */
import * as Schema from "effect/Schema"

/**
 * Raised when an empty or invalid word is passed to an inflection operation.
 *
 * @stability stable
 * @since 0.1.0
 */
export class InvalidWordError extends Schema.TaggedError<
  InvalidWordError,
  { readonly brand: unique symbol }
>()("InvalidWordError", {
  input: Schema.String,
  message: Schema.String
}) {}

/**
 * Raised when an unrecognized key is passed to `classical`.
 *
 * @stability stable
 * @since 0.1.0
 */
export class UnknownClassicalModeError extends Schema.TaggedError<
  UnknownClassicalModeError,
  { readonly brand: unique symbol }
>()("UnknownClassicalModeError", {
  mode: Schema.String,
  message: Schema.String
}) {}

/**
 * Raised when a numeric operation receives a malformed or non-finite value.
 *
 * @stability stable
 * @since 0.1.0
 */
export class BadNumValueError extends Schema.TaggedError<
  BadNumValueError,
  { readonly brand: unique symbol }
>()("BadNumValueError", {
  input: Schema.String,
  message: Schema.String
}) {}

/**
 * Raised when `numberToWords` receives a `group` value outside `0..3`.
 *
 * @stability stable
 * @since 0.1.0
 */
export class BadChunkingOptionError extends Schema.TaggedError<
  BadChunkingOptionError,
  { readonly brand: unique symbol }
>()("BadChunkingOptionError", {
  group: Schema.Union([Schema.Finite, Schema.String]),
  message: Schema.String
}) {}

/**
 * Raised when a number's magnitude exceeds the supported scale table (`10^33` decillion).
 *
 * @stability stable
 * @since 0.1.0
 */
export class NumOutOfRangeError extends Schema.TaggedError<
  NumOutOfRangeError,
  { readonly brand: unique symbol }
>()("NumOutOfRangeError", {
  input: Schema.String,
  message: Schema.String
}) {}

/**
 * Raised when a user-defined rule registers an invalid regular expression pattern.
 *
 * @stability stable
 * @since 0.1.0
 */
export class BadUserDefinedPatternError extends Schema.TaggedError<
  BadUserDefinedPatternError,
  { readonly brand: unique symbol }
>()("BadUserDefinedPatternError", {
  pattern: Schema.String,
  message: Schema.String
}) {}

/**
 * Raised when an unsupported pronoun gender string is supplied.
 *
 * @stability stable
 * @since 0.1.0
 */
export class BadGenderError extends Schema.TaggedError<
  BadGenderError,
  { readonly brand: unique symbol }
>()("BadGenderError", {
  gender: Schema.String,
  message: Schema.String
}) {}

/**
 * Raised when a recognized `inflect` template call has a malformed argument, such as an undefined
 * name (`plural(x)`) or a non-literal expression. Unrecognized calls are left unchanged instead.
 *
 * @stability stable
 * @since 0.1.0
 */
export class InflectTemplateError extends Schema.TaggedError<
  InflectTemplateError,
  { readonly brand: unique symbol }
>()("InflectTemplateError", {
  expression: Schema.String,
  message: Schema.String
}) {}

/**
 * Union of all typed domain errors emitted by `inflectionts`.
 *
 * @stability stable
 * @since 0.1.0
 */
export type InflectError =
  | InvalidWordError
  | UnknownClassicalModeError
  | BadNumValueError
  | BadChunkingOptionError
  | NumOutOfRangeError
  | BadUserDefinedPatternError
  | BadGenderError
  | InflectTemplateError
